import { apiSlice } from "../api/apiSlice";

export const extendedUsersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (arg) => {
        // Handle both object and direct search term
        const params = typeof arg === "object" ? arg : { search: arg };
        let url = `/user?page=${params.page || 1}`;
        if (params.search) {
          url += `&search=${encodeURIComponent(params.search)}`;
        }
        return url;
      },
      providesTags: (result = [], error) => {
        if (error) return [{ type: "User", id: "ERROR" }];
        return result?.data?.data
          ? [
              ...result.data.data.map(({ id }) => ({
                type: "User",
                id,
              })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }];
      },
    }),
    getUser: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => {
        if (error) {
          return [{ type: "User", id: "ERROR" }];
        }
        return [{ type: "User", id }];
      },
    }),
    addUser: builder.mutation({
      query: (body) => ({
        url: "/register",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/user/update/${id}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/user/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = extendedUsersApi;
