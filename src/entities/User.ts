export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  modifiedAt: Date;
}

export type PublicUser = Omit<User, "password">;

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
}

export type UpdateUserDTO = Partial<CreateUserDTO>;
