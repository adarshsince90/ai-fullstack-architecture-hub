import React from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';

// 1. Redux Store Setup
const cartSlice = createSlice({
  name: 'cart',
  initialState: { itemCount: 0 },
  reducers: {
    incrementCart: (state) => { state.itemCount += 1; },
    resetCart: (state) => { state.itemCount = 0; }
  }
});

const store = configureStore({
  reducer: { cart: cartSlice.reducer }
});

const { incrementCart } = cartSlice.actions;

// 2. Apollo GraphQL Client Setup
const client = new ApolloClient({
  uri: 'https://spacex-production.up.railway.app/',
  cache: new InMemoryCache()
});

const GET_LAUNCHES = gql`
  query GetLaunches {
    launchesPast(limit: 3) {
      id
      mission_name
      launch_date_local
    }
  }
`;

// 3. React Feature Component
function MissionList() {
  const dispatch = useDispatch();
  const itemCount = useSelector((state) => state.cart.itemCount);
  const { loading, error, data } = useQuery(GET_LAUNCHES);

  if (loading) return <p>Loading GraphQL data...</p>;
  if (error) return <p>GraphQL Error: {error.message}</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🚀 SpaceX Missions (GraphQL + Redux Toolkit)</h2>
      <p>Cart Items in Redux Store: <strong>{itemCount}</strong></p>

      <ul>
        {data.launchesPast.map((launch) => (
          <li key={launch.id} style={{ marginBottom: '10px' }}>
            <strong>{launch.mission_name}</strong> - {new Date(launch.launch_date_local).toLocaleDateString()}
            <button 
              onClick={() => dispatch(incrementCart())} 
              style={{ marginLeft: '10px', cursor: 'pointer' }}
            >
              Add Mission Ticket
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 4. Main App Container wrapping Providers
export default function AppSkeleton() {
  return (
    <Provider store={store}>
      <ApolloProvider client={client}>
        <MissionList />
      </ApolloProvider>
    </Provider>
  );
}
