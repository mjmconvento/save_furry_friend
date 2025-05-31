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
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../../AuthContext';
import { Post } from '../../../interface/Post';
import { updatePost as updatePostApi } from '../../../service/post/postApi';

interface EditPostDialogProps {
  open: boolean;
  editingPost: Post | null;
  handleCloseEditDialog: () => void;
  setToastOpen: (value: boolean) => void;
  setToastMessage: (message: string) => void;
  setToastSeverity: (severity: 'success' | 'error') => void;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({
  open,
  editingPost,
  handleCloseEditDialog,
  setToastOpen,
  setToastMessage,
  setToastSeverity,
  setPosts,
}) => {
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [updatedContent, setUpdatedContent] = useState<string>('');
  const [updatedTags, setUpdatedTags] = useState<string[]>([]);
  const { token } = useAuth()!;

  const tagOptions = ['happy_post', 'hearthbreaking_post', 'neutral_post'];

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const newTags = typeof value === 'string' ? value.split(',') : value;
    setUpdatedTags(newTags);
  };

  useEffect(() => {
    if (editingPost) {
      setUpdatedContent(editingPost.content);
      setUpdatedTags(editingPost.tags);
    }
  }, [editingPost, open]);

  const handleUpdate = async () => {
    if (!editingPost) return;

    try {
      const updatedPost = await updatePostApi({
        id: editingPost.id,
        content: updatedContent,
        tags: updatedTags,
        token: token,
      });

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === updatedPost.id ? updatedPost : post
        )
      );

      setFormErrorSummary([]);
      setUpdatedContent('');
      setUpdatedTags([]);

      setToastOpen(true);
      setToastMessage('Update success.');
      setToastSeverity('success');
      handleCloseEditDialog();
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseEditDialog}
      maxWidth="sm"
      fullWidth
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

      <DialogTitle sx={{ textAlign: 'center' }}>Edit Post</DialogTitle>
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
        <Button onClick={handleCloseEditDialog}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditPostDialog;
