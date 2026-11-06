import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class AppResolver {
  @Query(() => String, { description: 'Health check query' })
  health(): string {
    return 'StreamFlix GraphQL API is healthy';
  }
}
