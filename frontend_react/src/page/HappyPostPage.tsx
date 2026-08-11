import React from 'react';
import PostFeed from '../component/post/PostFeed';

const HappyPostPage: React.FC = () => (
  <PostFeed
    tag="happy_post"
    title="Happy Posts"
    subtitle="Reunions, adoptions and the good days."
  />
);

export default HappyPostPage;
