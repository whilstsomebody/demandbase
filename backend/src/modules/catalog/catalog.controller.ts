import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {} from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { CatalogService } from './catalog.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { UploadItemFileDto } from './dto/upload-item-file.dto.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @UseGuards(JwtAuthGuard)
  @Post('items')
  createItem(@CurrentUserId() userId: string, @Body() dto: CreateItemDto) {
    return this.catalog.createItem(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('items/mine')
  listMine(@CurrentUserId() userId: string) {
    return this.catalog.listMine(userId);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.catalog.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('items/:id')
  updateItem(@CurrentUserId() userId: string, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.catalog.updateItem(id, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:id')
  deleteItem(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.catalog.deleteItem(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('items/:id/photos')
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(@CurrentUserId() userId: string, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.catalog.addPhoto(id, userId, file.buffer);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.catalog.searchAvailableItems(query ?? '');
  }

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @UseGuards(JwtAuthGuard)
  @Post('items/:id/files')
  @UseInterceptors(FileInterceptor('file'))
  addFile(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadItemFileDto,
  ) {
    return this.catalog.addFile(id, userId, file, dto.accessMode ?? 'VIEW');
  }

  @UseGuards(JwtAuthGuard)
  @Get('items/:id/files')
  listFiles(@Param('id') id: string) {
    return this.catalog.listFiles(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('items/:id/files/:fileId/access')
  getFileAccessUrl(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('page') page?: string,
  ) {
    return this.catalog.getFileAccessUrl(id, fileId, userId, page ? Number(page) : 1);
  }
}
