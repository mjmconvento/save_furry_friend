export interface Post {
  // Mongo document ids are UUID strings, not integers.
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  medias: string[];
}
