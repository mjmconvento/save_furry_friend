import React, { useState } from 'react';
import {
  Avatar,
  Box,
  BoxProps,
  Button,
  Card,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Delete,
  Edit,
  Favorite,
  FavoriteBorder,
  LocalFlorist,
  LocalFloristOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css';
import { Post } from '../../interface/Post';
import { useAuth } from '../../AuthContext';
import { useNotify } from '../template/ToastProvider';
import { errorSummary } from '../../service/apiClient';
import { likePost, unlikePost } from '../../service/post/postApi';
import PostLikersDialog from './PostLikersDialog';
import {
  POST_TONE_BY_TAG,
  PostTag,
  TONE_AFFIRM,
  ToneKey,
} from '../../config/tags';

/**
 * `subtitle2` supplies the uppercase eyebrow treatment; `component="span"` stops
 * MUI mapping that variant onto an <h6>, since a badge is not a heading.
 */
const ToneBadge: React.FC<{ tone: ToneKey; label: string }> = ({
  tone,
  label,
}) => (
  <Box
    sx={(theme) => ({
      px: '10px',
      py: '4px',
      borderRadius: '4px',
      flexShrink: 0,
      bgcolor: theme.palette.tone[tone].soft,
    })}
  >
    <Typography
      variant="subtitle2"
      component="span"
      sx={(theme) => ({ color: theme.palette.tone[tone].main })}
    >
      {label}
    </Typography>
  </Box>
);

interface MediaThumbProps {
  url: string;
  alt: string;
  /**
   * Dimensions are responsive so the cover can be a full-width banner on a
   * phone and a square beside the text from `sm` up, while the footer strip
   * stays a fixed 48px square at every width.
   */
  width: BoxProps['width'];
  height: BoxProps['height'];
  imageSizes: Record<string, { width: number; height: number }>;
}

/**
 * One photoswipe item. Every thumbnail of a post shares a single <Gallery>, so
 * the lightbox pages through the cover and the footer strip as one set.
 */
const MediaThumb: React.FC<MediaThumbProps> = ({
  url,
  alt,
  width,
  height,
  imageSizes,
}) => (
  <Item
    original={url}
    thumbnail={url}
    width={imageSizes[url]?.width || 1024}
    height={imageSizes[url]?.height || 768}
  >
    {({ ref, open }) => (
      <Box
        component="img"
        ref={ref}
        onClick={open}
        src={url}
        alt={alt}
        sx={{
          width,
          height,
          flexShrink: 0,
          objectFit: 'cover',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      />
    )}
  </Item>
);

interface PostCardProps {
  post: Post;
  isOwner: boolean;
  profileTo: string;
  imageSizes: Record<string, { width: number; height: number }>;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  /**
   * The tone the surrounding feed already announces. A single-tone feed
   * repeating its own name on every card is pure noise, so that one badge is
   * dropped - any OTHER tone a post carries still shows.
   */
  suppressTone?: PostTag;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  isOwner,
  profileTo,
  imageSizes,
  onEdit,
  onDelete,
  suppressTone,
}) => {
  const { token } = useAuth();
  const notify = useNotify();
  const [cover, ...moreMedias] = post.medias ?? [];
  const badgeTag = post.tags?.find(
    (tag) => tag in POST_TONE_BY_TAG && tag !== suppressTone
  );
  const badge = badgeTag ? POST_TONE_BY_TAG[badgeTag] : undefined;

  // The verb follows the post's own tone, not the feed's, so the badge and the
  // button always agree - including on a post carrying two tones.
  const ownTag = post.tags?.find((tag) => tag in POST_TONE_BY_TAG);
  const tone = ownTag ? POST_TONE_BY_TAG[ownTag]?.tone : undefined;
  const affirm = TONE_AFFIRM[tone ?? 'neutral'];

  const [liked, setLiked] = useState<boolean>(post.likedByViewer);
  const [likes, setLikes] = useState<number>(post.likeCount);
  const [rosterOpen, setRosterOpen] = useState<boolean>(false);

  const toggleLike = async () => {
    const wasLiked = liked;

    // Optimistic: the count moves under the finger, then the server's own
    // numbers replace it. A failure puts the old pair back, because a count
    // left wrong is worse than one that flickers.
    setLiked(!wasLiked);
    setLikes((count) => count + (wasLiked ? -1 : 1));

    try {
      const saved = await (wasLiked ? unlikePost : likePost)({
        id: post.id,
        token,
      });

      setLiked(saved.likedByViewer);
      setLikes(saved.likeCount);
    } catch (error) {
      setLiked(wasLiked);
      setLikes(post.likeCount);
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    }
  };

  return (
    <Card>
      <Gallery>
        <Box
          sx={{
            display: 'flex',
            // A phone gets a stacked card led by a banner cover; from `sm` up
            // this resolves to exactly the desktop row.
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            gap: 2,
            p: 2,
          }}
        >
          {cover && (
            <MediaThumb
              url={cover}
              alt={`Photo 1 from ${post.authorName}'s post`}
              width={{ xs: '100%', sm: 120 }}
              height={{ xs: 200, sm: 120 }}
              imageSizes={imageSizes}
            />
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              gap: 1,
              // Without this, one long unbroken word in the content would push
              // the column wider than the card instead of wrapping inside it.
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                // Narrow enough and the badge drops under the author block
                // rather than squeezing the timestamp. There is no wrap at the
                // widths the desktop layout produces, so the row gap only ever
                // shows up on a phone.
                flexWrap: 'wrap',
                columnGap: 2,
                rowGap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  columnGap: 1,
                  rowGap: 0.5,
                  minWidth: 0,
                }}
              >
                {/* `src` undefined falls back to the child initial, and an author
                    name the server built from an empty profile would make `[0]`
                    throw during render. */}
                <Avatar src={post.authorAvatar ?? undefined} alt="">
                  {post.authorName?.trim().charAt(0).toUpperCase() || '?'}
                </Avatar>

                <Link to={profileTo} style={{ textDecoration: 'none' }}>
                  <Typography
                    variant="body2"
                    component="span"
                    fontWeight={600}
                    color="text.primary"
                    sx={{ '&:hover': { textDecoration: 'underline' } }}
                  >
                    {post.authorName}
                  </Typography>
                </Link>

                <Typography variant="caption">
                  {/* Seconds are noise on a feed; day + minute is the story's
                      real resolution. */}
                  {new Date(post.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Typography>
              </Box>

              {badge && <ToneBadge {...badge} />}
            </Box>

            <Typography
              variant="body1"
              color="text.secondary"
              // 60ch of Inter is ~75 real characters per line - the readable
              // measure. Unconstrained, text ran 105-123 characters; ch tracks
              // the wide "0" glyph, so 70ch still rendered ~88.
              sx={{ overflowWrap: 'anywhere', maxWidth: '60ch' }}
            >
              {post.content}
            </Typography>

            {/* Always rendered now: every post can be affirmed, so the row is
                no longer conditional on media or ownership. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                columnGap: 2,
                rowGap: 1,
              }}
            >
              {moreMedias.map((url, idx) => (
                <MediaThumb
                  key={url}
                  url={url}
                  alt={`Photo ${idx + 2} from ${post.authorName}'s post`}
                  width={48}
                  height={48}
                  imageSizes={imageSizes}
                />
              ))}

              {/* Two controls, one number. Folding the roster into the toggle
                  would make every attempt to read who liked something a like. */}
              <IconButton
                size="small"
                onClick={toggleLike}
                aria-label={liked ? affirm.undo : affirm.verb}
                sx={{
                  color: liked
                    ? `tone.${tone ?? 'neutral'}.main`
                    : 'text.muted',
                }}
              >
                {tone === 'heartbreaking' ? (
                  liked ? (
                    <LocalFlorist fontSize="small" />
                  ) : (
                    <LocalFloristOutlined fontSize="small" />
                  )
                ) : liked ? (
                  <Favorite fontSize="small" />
                ) : (
                  <FavoriteBorder fontSize="small" />
                )}
              </IconButton>

              {likes > 0 && (
                <Button
                  size="small"
                  onClick={() => setRosterOpen(true)}
                  aria-label={`See who ${affirm.past} this, ${likes}`}
                  sx={{ color: 'text.muted', minWidth: 0, ml: -1.5 }}
                >
                  {likes}
                </Button>
              )}

              {isOwner && (
                <Box sx={{ display: 'flex', ml: 'auto' }}>
                  <IconButton aria-label="Edit" onClick={() => onEdit(post)}>
                    <Edit />
                  </IconButton>
                  <IconButton
                    color="error"
                    aria-label="Delete"
                    onClick={() => onDelete(post)}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Gallery>

      {/* Mounted alongside the card, not inside the Gallery: photoswipe owns
          that subtree. Kept mounted so reopening a roster is instant. */}
      <PostLikersDialog
        postId={post.id}
        title={affirm.rosterTitle}
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
      />
    </Card>
  );
};

export default PostCard;
