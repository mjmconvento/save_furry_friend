import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
} from '@mui/material';
import ErrorList from '../../template/ErrorList';
import { useNotify } from '../../template/ToastProvider';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../../AuthContext';
import { Post } from '../../../interface/Post';
import { updatePost as updatePostApi } from '../../../service/post/postApi';
import { errorSummary } from '../../../service/apiClient';
import { POST_TONE_BY_TAG } from '../PostCard';

interface EditPostDialogProps {
  open: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved: (post: Post) => void;
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({
  open,
  post,
  onClose,
  onSaved,
}) => {
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [updatedContent, setUpdatedContent] = useState<string>('');
  const [updatedTags, setUpdatedTags] = useState<string[]>([]);
  const { token } = useAuth();
  const notify = useNotify();

  // Derived from the tone table rather than a second hand-written list. The
  // literal that used to live here read 'hearthbreaking_post', which matched
  // no feed filter and no badge, so tagging a post that way hid it everywhere.
  const tagOptions = Object.keys(POST_TONE_BY_TAG);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const newTags = typeof value === 'string' ? value.split(',') : value;
    setUpdatedTags(newTags);
  };

  useEffect(() => {
    if (post) {
      setUpdatedContent(post.content);
      setUpdatedTags(post.tags);
    }
  }, [post, open]);

  const handleUpdate = async () => {
    if (!post) return;

    try {
      const updatedPost = await updatePostApi({
        id: post.id,
        content: updatedContent,
        tags: updatedTags,
        token: token,
      });

      onSaved(updatedPost);

      setFormErrorSummary([]);
      setUpdatedContent('');
      setUpdatedTags([]);

      notify({ message: 'Update success.', severity: 'success' });
      onClose();
    } catch (error: unknown) {
      setFormErrorSummary(errorSummary(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-post-title"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 12,
          padding: 5,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Box display="flex" justifyContent="center" mb={1}>
        <EditIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <DialogTitle id="edit-post-title" sx={{ textAlign: 'center' }}>
        Edit Post
      </DialogTitle>
      <ErrorList errors={formErrorSummary} />

      <DialogContent>
        <TextField
          margin="normal"
          label="Content"
          fullWidth
          value={updatedContent}
          onChange={(e) => setUpdatedContent(e.target.value)}
          multiline
          rows={4}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="multi-select-label">Select Tags</InputLabel>
          <Select
            labelId="multi-select-label"
            multiple
            value={updatedTags}
            onChange={handleChange}
            label="Select Tags"
            renderValue={(selected) => selected.join(', ')}
          >
            {tagOptions.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={updatedTags.includes(option)} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPostDialog;
