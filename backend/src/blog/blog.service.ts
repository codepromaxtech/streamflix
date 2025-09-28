import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorType: 'streamer' | 'admin';
  category: string;
  tags: string[];
  featuredImageUrl?: string;
  status: 'draft' | 'published' | 'archived';
  isSticky: boolean;
  allowComments: boolean;
  views: number;
  likes: number;
  comments: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

interface BlogComment {
  id: string;
  postId: string;
  authorId?: string;
  authorName: string;
  authorEmail: string;
  content: string;
  parentId?: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  replies: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  postCount: number;
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
  }>;
  topCategories: Array<{
    name: string;
    postCount: number;
  }>;
}

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultCategories();
  }

  async createPost(
    authorId: string,
    authorType: 'streamer' | 'admin',
    postData: {
      title: string;
      content: string;
      excerpt?: string;
      category: string;
      tags?: string[];
      featuredImageUrl?: string;
      status?: 'draft' | 'published';
      allowComments?: boolean;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string[];
    },
  ): Promise<BlogPost> {
    try {
      const slug = this.generateSlug(postData.title);
      
      // Check if slug already exists
      const existingPost = await this.prisma.blogPost.findUnique({
        where: { slug },
      });

      if (existingPost) {
        throw new BadRequestException('A post with this title already exists');
      }

      const blogPost: BlogPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: postData.title,
        slug,
        content: postData.content,
        excerpt: postData.excerpt || this.generateExcerpt(postData.content),
        authorId,
        authorType,
        category: postData.category,
        tags: postData.tags || [],
        featuredImageUrl: postData.featuredImageUrl,
        status: postData.status || 'draft',
        isSticky: false,
        allowComments: postData.allowComments ?? true,
        views: 0,
        likes: 0,
        comments: 0,
        publishedAt: postData.status === 'published' ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        seoTitle: postData.seoTitle,
        seoDescription: postData.seoDescription,
        seoKeywords: postData.seoKeywords,
      };

      // Save to database
      await this.prisma.blogPost.create({
        data: blogPost,
      });

      // Update category post count
      await this.updateCategoryPostCount(postData.category);

      this.logger.log(`Blog post created: ${blogPost.id} by ${authorType} ${authorId}`);

      // Emit event
      this.eventEmitter.emit('blog.post_created', blogPost);

      return blogPost;
    } catch (error) {
      this.logger.error('Error creating blog post:', error);
      throw error;
    }
  }

  async updatePost(
    postId: string,
    authorId: string,
    updates: Partial<BlogPost>,
  ): Promise<BlogPost> {
    try {
      const existingPost = await this.prisma.blogPost.findUnique({
        where: { id: postId },
      });

      if (!existingPost) {
        throw new NotFoundException('Blog post not found');
      }

      // Check if user can edit this post
      if (existingPost.authorId !== authorId && existingPost.authorType !== 'admin') {
        throw new BadRequestException('You can only edit your own posts');
      }

      // Update slug if title changed
      if (updates.title && updates.title !== existingPost.title) {
        updates.slug = this.generateSlug(updates.title);
      }

      // Update published date if status changed to published
      if (updates.status === 'published' && existingPost.status !== 'published') {
        updates.publishedAt = new Date();
      }

      updates.updatedAt = new Date();

      const updatedPost = await this.prisma.blogPost.update({
        where: { id: postId },
        data: updates,
      });

      this.logger.log(`Blog post updated: ${postId}`);

      // Emit event
      this.eventEmitter.emit('blog.post_updated', updatedPost);

      return updatedPost as any;
    } catch (error) {
      this.logger.error('Error updating blog post:', error);
      throw error;
    }
  }

  async getPosts(
    filters: {
      status?: string;
      category?: string;
      authorId?: string;
      authorType?: string;
      tag?: string;
      search?: string;
    } = {},
    pagination: {
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ posts: BlogPost[]; total: number }> {
    try {
      const { limit = 20, offset = 0 } = pagination;
      
      let whereClause: any = {};

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.category) {
        whereClause.category = filters.category;
      }

      if (filters.authorId) {
        whereClause.authorId = filters.authorId;
      }

      if (filters.authorType) {
        whereClause.authorType = filters.authorType;
      }

      if (filters.tag) {
        whereClause.tags = {
          has: filters.tag,
        };
      }

      if (filters.search) {
        whereClause.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
          { excerpt: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [posts, total] = await Promise.all([
        this.prisma.blogPost.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isVerified: true,
              },
            },
            _count: {
              select: {
                comments: {
                  where: { status: 'approved' },
                },
              },
            },
          },
          orderBy: [
            { isSticky: 'desc' },
            { publishedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          skip: offset,
          take: limit,
        }),
        this.prisma.blogPost.count({ where: whereClause }),
      ]);

      return { posts: posts as any, total };
    } catch (error) {
      this.logger.error('Error fetching blog posts:', error);
      throw error;
    }
  }

  async getPostBySlug(slug: string, incrementView: boolean = true): Promise<BlogPost | null> {
    try {
      const post = await this.prisma.blogPost.findUnique({
        where: { slug },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: { status: 'approved' },
              },
            },
          },
        },
      });

      if (!post) {
        return null;
      }

      // Increment view count
      if (incrementView && post.status === 'published') {
        await this.prisma.blogPost.update({
          where: { id: post.id },
          data: {
            views: {
              increment: 1,
            },
          },
        });
      }

      return post as any;
    } catch (error) {
      this.logger.error('Error fetching blog post by slug:', error);
      return null;
    }
  }

  async deletePost(postId: string, authorId: string): Promise<void> {
    try {
      const post = await this.prisma.blogPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Blog post not found');
      }

      // Check if user can delete this post
      if (post.authorId !== authorId && post.authorType !== 'admin') {
        throw new BadRequestException('You can only delete your own posts');
      }

      await this.prisma.blogPost.delete({
        where: { id: postId },
      });

      // Update category post count
      await this.updateCategoryPostCount(post.category);

      this.logger.log(`Blog post deleted: ${postId}`);

      // Emit event
      this.eventEmitter.emit('blog.post_deleted', { postId, authorId });
    } catch (error) {
      this.logger.error('Error deleting blog post:', error);
      throw error;
    }
  }

  async addComment(
    postId: string,
    commentData: {
      authorId?: string;
      authorName: string;
      authorEmail: string;
      content: string;
      parentId?: string;
    },
  ): Promise<BlogComment> {
    try {
      const post = await this.prisma.blogPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Blog post not found');
      }

      if (!post.allowComments) {
        throw new BadRequestException('Comments are not allowed on this post');
      }

      const comment: BlogComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        postId,
        authorId: commentData.authorId,
        authorName: commentData.authorName,
        authorEmail: commentData.authorEmail,
        content: commentData.content,
        parentId: commentData.parentId,
        status: 'pending', // Require moderation
        likes: 0,
        replies: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.prisma.blogComment.create({
        data: comment,
      });

      // Update reply count if this is a reply
      if (commentData.parentId) {
        await this.prisma.blogComment.update({
          where: { id: commentData.parentId },
          data: {
            replies: {
              increment: 1,
            },
          },
        });
      }

      this.logger.log(`Blog comment added: ${comment.id} on post ${postId}`);

      // Emit event
      this.eventEmitter.emit('blog.comment_added', comment);

      return comment;
    } catch (error) {
      this.logger.error('Error adding blog comment:', error);
      throw error;
    }
  }

  async getComments(
    postId: string,
    status: 'approved' | 'pending' | 'all' = 'approved',
    limit: number = 50,
    offset: number = 0,
  ): Promise<BlogComment[]> {
    try {
      let whereClause: any = {
        postId,
        parentId: null, // Only top-level comments
      };

      if (status !== 'all') {
        whereClause.status = status;
      }

      const comments = await this.prisma.blogComment.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          replies: {
            where: {
              status: status === 'all' ? undefined : status,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 5, // Show first 5 replies
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      return comments as any;
    } catch (error) {
      this.logger.error('Error fetching blog comments:', error);
      throw error;
    }
  }

  async moderateComment(
    commentId: string,
    status: 'approved' | 'rejected',
    moderatorId: string,
  ): Promise<void> {
    try {
      const comment = await this.prisma.blogComment.update({
        where: { id: commentId },
        data: { status },
      });

      // Update post comment count if approved
      if (status === 'approved') {
        await this.prisma.blogPost.update({
          where: { id: comment.postId },
          data: {
            comments: {
              increment: 1,
            },
          },
        });
      }

      this.logger.log(`Comment ${commentId} ${status} by moderator ${moderatorId}`);

      // Emit event
      this.eventEmitter.emit('blog.comment_moderated', { commentId, status, moderatorId });
    } catch (error) {
      this.logger.error('Error moderating comment:', error);
      throw error;
    }
  }

  async getCategories(): Promise<BlogCategory[]> {
    try {
      const categories = await this.prisma.blogCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      return categories as any;
    } catch (error) {
      this.logger.error('Error fetching blog categories:', error);
      throw error;
    }
  }

  async getBlogStats(authorId?: string, authorType?: string): Promise<BlogStats> {
    try {
      let whereClause: any = {};

      if (authorId) {
        whereClause.authorId = authorId;
      }

      if (authorType) {
        whereClause.authorType = authorType;
      }

      const [totalPosts, publishedPosts, draftPosts, viewsAggregate] = await Promise.all([
        this.prisma.blogPost.count({ where: whereClause }),
        this.prisma.blogPost.count({ where: { ...whereClause, status: 'published' } }),
        this.prisma.blogPost.count({ where: { ...whereClause, status: 'draft' } }),
        this.prisma.blogPost.aggregate({
          where: whereClause,
          _sum: { views: true, comments: true },
        }),
      ]);

      const topPosts = await this.prisma.blogPost.findMany({
        where: { ...whereClause, status: 'published' },
        select: {
          id: true,
          title: true,
          views: true,
          likes: true,
        },
        orderBy: { views: 'desc' },
        take: 10,
      });

      const topCategories = await this.prisma.blogPost.groupBy({
        by: ['category'],
        where: { ...whereClause, status: 'published' },
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      });

      return {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalViews: viewsAggregate._sum.views || 0,
        totalComments: viewsAggregate._sum.comments || 0,
        topPosts,
        topCategories: topCategories.map(cat => ({
          name: cat.category,
          postCount: cat._count.category,
        })),
      };
    } catch (error) {
      this.logger.error('Error fetching blog stats:', error);
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private generateExcerpt(content: string, maxLength: number = 200): string {
    // Strip HTML tags and get first 200 characters
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  private async updateCategoryPostCount(categoryName: string): Promise<void> {
    try {
      const postCount = await this.prisma.blogPost.count({
        where: {
          category: categoryName,
          status: 'published',
        },
      });

      await this.prisma.blogCategory.update({
        where: { name: categoryName },
        data: { postCount },
      });
    } catch (error) {
      // Category might not exist, create it
      await this.prisma.blogCategory.create({
        data: {
          id: `cat_${Date.now()}`,
          name: categoryName,
          slug: this.generateSlug(categoryName),
          color: '#3B82F6',
          isActive: true,
          postCount: 1,
        },
      });
    }
  }

  private async initializeDefaultCategories(): Promise<void> {
    const defaultCategories = [
      { name: 'Streaming Tips', color: '#10B981', description: 'Tips and tricks for better streaming' },
      { name: 'Gaming', color: '#8B5CF6', description: 'Gaming content and reviews' },
      { name: 'Technology', color: '#3B82F6', description: 'Tech news and tutorials' },
      { name: 'Entertainment', color: '#F59E0B', description: 'Entertainment industry news' },
      { name: 'Community', color: '#EF4444', description: 'Community updates and events' },
      { name: 'Announcements', color: '#6B7280', description: 'Platform announcements' },
    ];

    for (const category of defaultCategories) {
      await this.prisma.blogCategory.upsert({
        where: { name: category.name },
        update: {},
        create: {
          id: `cat_${category.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: category.name,
          slug: this.generateSlug(category.name),
          description: category.description,
          color: category.color,
          isActive: true,
          postCount: 0,
        },
      });
    }
  }
}
