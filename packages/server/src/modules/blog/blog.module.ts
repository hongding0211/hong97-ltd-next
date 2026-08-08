import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '../auth/auth.module'
import {
  BLOG_VIEW_REDIS_CLIENT_FACTORY,
  BlogViewDedupeService,
  createBlogViewRedisClient,
} from './blog-view-dedupe.service'
import { BlogController } from './blog.controller'
import { BlogService } from './blog.service'
import { Blog, BlogSchema } from './schema/blog.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }]),
    AuthModule,
  ],
  controllers: [BlogController],
  providers: [
    BlogService,
    BlogViewDedupeService,
    {
      provide: BLOG_VIEW_REDIS_CLIENT_FACTORY,
      useValue: createBlogViewRedisClient,
    },
  ],
  exports: [BlogService],
})
export class BlogModule {}
