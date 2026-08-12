import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Avatar,
  Chip,
} from '@mui/material';
import { User } from '../../../interface/User';

interface Props {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserList: React.FC<Props> = ({ users, onEdit, onDelete }) => {
  return (
    <TableContainer component={Paper} sx={{ mb: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            {/* The id is the least useful column to a person reading this, and
                a picture is the most, so the picture leads. */}
            <TableCell />
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell sx={{ width: 56, pr: 0 }}>
                <Avatar src={user.avatar ?? undefined} alt="">
                  {user.first_name.trim().charAt(0).toUpperCase() || '?'}
                </Avatar>
              </TableCell>
              <TableCell>
                {`${user.first_name} ${user.middle_name ?? ''} ${user.last_name}`.trim()}
                {user.roles.includes('admin') && (
                  <Chip label="admin" size="small" sx={{ ml: 1 }} />
                )}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell align="right">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onEdit(user)}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  style={{ marginLeft: 8 }}
                  onClick={() => onDelete(user)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserList;
