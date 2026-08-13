# 04. State Management: Redux Toolkit & GraphQL (Apollo Client)

## 🔀 Redux & Redux Toolkit (RTK)

Modern Redux applications use **Redux Toolkit (RTK)** to eliminate legacy Redux boilerplate.

### 1. Core Principles
- **Single Source of Truth:** Global state stored in a single object tree within a single store.
- **State is Read-Only:** The only way to change state is to dispatch an **action** (an object describing what happened).
- **Changes made with Pure Functions:** **Reducers** accept current state and action, returning next state.

---

### 2. Creating a Slice (`createSlice`)
RTK's `createSlice` automatically generates action creators and action types while using **Immer** under the hood to let you write "mutating" syntax safely.

```typescript
import { createSlice, PayloadAction } from '@reduxjs.toolkit';

interface UserState {
  name: string;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  name: '',
  isLoggedIn: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<string>) => {
      // Looks like mutation, but Immer creates an immutable copy safely!
      state.name = action.payload;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.name = '';
      state.isLoggedIn = false;
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
```

---

### 3. Async Actions with `createAsyncThunk`

```typescript
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`);
    return await res.json();
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState: { data: null, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      });
  },
});
```

---

## 📡 GraphQL & Apollo Client Integration

### 1. GraphQL vs REST API
| Feature | REST API | GraphQL |
| :--- | :--- | :--- |
| **Data Fetching** | Multiple endpoints (`/users`, `/posts`). Over-fetching or under-fetching data. | Single endpoint (`/graphql`). Client requests exact fields needed. |
| **Schema & Typing** | OpenAPI / Swagger docs optional. | Strongly typed schema (SDL) built-in. |
| **Operations** | GET, POST, PUT, DELETE. | Queries (Read), Mutations (Write), Subscriptions (Real-time WS). |

---

### 2. Apollo Client Queries & Mutations

```jsx
import { gql, useQuery, useMutation } from '@apollo/client';

// Define Document Node
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const UPDATE_USER_NAME = gql`
  mutation UpdateUserName($id: ID!, $name: String!) {
    updateUser(id: $id, name: $name) {
      id
      name
    }
  }
`;

function UserProfile({ userId }) {
  const { loading, error, data } = useQuery(GET_USER, { variables: { id: userId } });
  const [updateName] = useMutation(UPDATE_USER_NAME);

  if (loading) return <p>Loading user profile...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h3>{data.user.name}</h3>
      <button onClick={() => updateName({ variables: { id: userId, name: 'Senior Developer' } })}>
        Update Name
      </button>
    </div>
  );
}
```
