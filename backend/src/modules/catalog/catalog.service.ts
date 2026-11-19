import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CloudinaryService } from '../../storage/cloudinary.service.js';
import { matchesDisallowedTerms } from './content-policy.js';
import type { CreateItemDto } from './dto/create-item.dto.js';
import type { UpdateItemDto } from './dto/update-item.dto.js';

const ITEM_SEARCH_INCLUDE = {
  owner: { select: { id: true, name: true, trustScore: true } },
  category: true,
  photos: true,
} as const;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  createItem(ownerId: string, dto: CreateItemDto) {
    return this.prisma.item.create({
      data: {
        ownerId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        categoryId: dto.categoryId,
        maxLoanDurationDays: dto.maxLoanDurationDays ?? 7,
      },
      include: ITEM_SEARCH_INCLUDE,
    });
  }

  listMine(ownerId: string) {
    return this.prisma.item.findMany({
      where: { ownerId },
      include: ITEM_SEARCH_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id }, include: ITEM_SEARCH_INCLUDE });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async updateItem(id: string, ownerId: string, dto: UpdateItemDto) {
    await this.assertOwner(id, ownerId);
    return this.prisma.item.update({
      where: { id },
      data: dto,
      include: ITEM_SEARCH_INCLUDE,
    });
  }

  async deleteItem(id: string, ownerId: string) {
    await this.assertOwner(id, ownerId);
    await this.prisma.item.delete({ where: { id } });
  }

  async addPhoto(id: string, ownerId: string, fileBuffer: Buffer) {
    await this.assertOwner(id, ownerId);
    const uploaded = await this.cloudinary.uploadPublicImageBuffer(fileBuffer);
    return this.prisma.itemPhoto.create({ data: { itemId: id, url: uploaded.secure_url } });
  }

  async addFile(itemId: string, ownerId: string, file: { buffer: Buffer; originalname: string }, accessMode: 'VIEW' | 'DOWNLOAD') {
    const item = await this.assertOwner(itemId, ownerId);
    if (item.type !== 'DIGITAL') {
      throw new BadRequestException('Files can only be attached to digital items');
    }

    const flagged = matchesDisallowedTerms(item.title, item.description, file.originalname);
    const uploaded = await this.cloudinary.uploadPrivateImageBuffer(file.buffer);

    return this.prisma.itemFile.create({
      data: {
        itemId,
        publicId: uploaded.public_id,
        resourceType: 'image',
        originalFilename: file.originalname,
        url: uploaded.secure_url,
        accessMode,
        flaggedForReview: flagged,
      },
      select: { id: true, originalFilename: true, accessMode: true, flaggedForReview: true, createdAt: true },
    });
  }

  listFiles(itemId: string) {
    return this.prisma.itemFile.findMany({
      where: { itemId },
      select: { id: true, originalFilename: true, accessMode: true, flaggedForReview: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gated, per-viewer-watermarked access: the item owner always has access; anyone else
   * needs an active (not yet past its due date) loan on this item.
   */
  async getFileAccessUrl(itemId: string, fileId: string, userId: string, page = 1) {
    const file = await this.prisma.itemFile.findUnique({ where: { id: fileId } });
    if (!file || file.itemId !== itemId) throw new NotFoundException('File not found');

    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    if (item.ownerId !== userId) {
      const activeLoan = await this.prisma.loan.findFirst({
        where: {
          itemId,
          borrowerId: userId,
          state: { in: ['ACTIVE', 'RETURN_REQUESTED'] },
          OR: [{ dueAt: null }, { dueAt: { gte: new Date() } }],
        },
      });
      if (!activeLoan) {
        throw new ForbiddenException('You need an active loan on this item to view this file');
      }
    }

    const viewer = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const watermarkText = `${viewer.name} - ${new Date().toISOString().slice(0, 10)}`;
    const expiresInSeconds = 600;

    return {
      url: this.cloudinary.getWatermarkedAccessUrl({ publicId: file.publicId, watermarkText, page, expiresInSeconds }),
      accessMode: file.accessMode,
      expiresInSeconds,
    };
  }

  /**
   * Keyword search against item title/description (full-text) and category name/synonyms.
   * Shared by the catalog search box (Path A) and the broadcast message matcher (Phase 2).
   */
  async searchAvailableItems(query: string, excludeOwnerId?: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT i.id, i."createdAt"
      FROM items i
      WHERE i.status = 'AVAILABLE'
        AND (
          EXISTS (
            SELECT 1 FROM categories c
            WHERE c.id = i."categoryId" AND c.name ILIKE '%' || ${trimmed} || '%'
          )
          OR EXISTS (
            SELECT 1 FROM category_synonyms cs
            WHERE cs."categoryId" = i."categoryId" AND cs.term ILIKE '%' || ${trimmed} || '%'
          )
          OR i.search_vector @@ plainto_tsquery('english', ${trimmed})
        )
      ORDER BY i."createdAt" DESC
      LIMIT 50
    `;

    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const items = await this.prisma.item.findMany({
      where: {
        id: { in: ids },
        ...(excludeOwnerId ? { ownerId: { not: excludeOwnerId } } : {}),
      },
      include: ITEM_SEARCH_INCLUDE,
    });

    const order = new Map(ids.map((id, index) => [id, index]));
    return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  private async assertOwner(itemId: string, ownerId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('You do not own this item');
    return item;
  }
}
