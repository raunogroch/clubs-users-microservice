import { Roles } from "../../common";

export interface JwtPayload {
  id: string;
  name: string;
  lastname: string;
  username: string;
  roles: string[];
}
