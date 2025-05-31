export interface Post {
  id: number;
  content: string;
  authorId: number | string;
  authorName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
