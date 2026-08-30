import React from 'react';
import {
  Avatar,
  Box,
  BoxProps,
  Card,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css';
import { Post } from '../../interface/Post';
import { POST_TONE_BY_TAG, PostTag, ToneKey } from '../../config/tags';

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
  const [cover, ...moreMedias] = post.medias ?? [];
  const toneTag = post.tags?.find(
    (tag) => tag in POST_TONE_BY_TAG && tag !== suppressTone
  );
  const badge = toneTag ? POST_TONE_BY_TAG[toneTag] : undefined;
  const hasFooter = moreMedias.length > 0 || isOwner;

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

            {hasFooter && (
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
            )}
          </Box>
        </Box>
      </Gallery>
    </Card>
  );
};

export default PostCard;
