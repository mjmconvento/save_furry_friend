import React from 'react';

interface EditFormProps {
    name: string;
    email: string;
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUpdate: () => void;
    onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({
    name,
    email,
    onNameChange,
    onEmailChange,
    onUpdate,
    onCancel,
}) => {
    return (
        <div>
            <h3>Edit User</h3>
            <input
                type="text"
                value={name}
                onChange={onNameChange}
                placeholder="Name"
            />
            <input
                type="email"
                value={email}
                onChange={onEmailChange}
                placeholder="Email"
            />
            <button onClick={onUpdate}>Update</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    );
};

export default EditForm;