import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CatalogService, ITEM_SEARCH_INCLUDE } from '../catalog/catalog.service.js';
import { RequestOfferLoanService } from '../request-offer-loan/request-offer-loan.service.js';

// Strict, deliberately uncomplicated grammar: "I need {requirement}, is anyone up for it?"
// Lenient on case/whitespace/trailing punctuation; anything else is just a normal message.
const REQUEST_FORMAT = /^i need\s+(.+?)\s*,\s*is anyone up for it\s*\??\s*$/i;

const POSTS_PER_HOUR_LIMIT = 10;

function extractRequirement(body: string): string | null {
  const match = REQUEST_FORMAT.exec(body.trim());
  if (!match) return null;
  const requirement = match[1]?.trim();
  return requirement ? requirement : null;
}

@Injectable()
export class CommunityFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly requestOfferLoan: RequestOfferLoanService,
  ) {}

  /** Read-only: shows what posting this body would do, before anything is created. */
  async preview(authorId: string, body: string) {
    const requirementText = extractRequirement(body);
    if (!requirementText) {
      return { isRequest: false as const };
    }

    const matches = await this.catalog.searchAvailableItems(requirementText, authorId);
    return {
      isRequest: true as const,
      requirementText,
      matches: matches.map((item) => ({
        itemId: item.id,
        title: item.title,
        ownerId: item.ownerId,
        ownerName: item.owner.name,
        ownerTrustScore: item.owner.trustScore,
      })),
    };
  }

  async createPost(authorId: string, body: string) {
    await this.assertNotRateLimited(authorId);

    const requirementText = extractRequirement(body);

    if (!requirementText) {
      return this.prisma.feedMessage.create({
        data: { authorId, body, isRequest: false },
        include: { author: { select: { id: true, name: true } } },
      });
    }

    const { request } = await this.requestOfferLoan.createBroadcastRequest(authorId, body, requirementText);

    return this.prisma.feedMessage.create({
      data: { authorId, body, isRequest: true, requestId: request.id },
      include: {
        author: { select: { id: true, name: true } },
        request: { include: { offers: { include: { item: { include: ITEM_SEARCH_INCLUDE } } } } },
      },
    });
  }

  listFeed() {
    return this.prisma.feedMessage.findMany({
      include: {
        author: { select: { id: true, name: true } },
        request: { include: { offers: { include: { item: { include: ITEM_SEARCH_INCLUDE } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async assertNotRateLimited(authorId: string) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.feedMessage.count({ where: { authorId, createdAt: { gte: since } } });
    if (recentCount >= POSTS_PER_HOUR_LIMIT) {
      throw new HttpException('Too many posts - try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
