import { Roles } from '../../common';
import { Role as PrismaRole } from '../../generated/prisma/client';

// Legacy JWT payload (global roles, for backward compatibility)
export interface JwtPayload {
  id: string;
  name: string;
  lastname: string;
  username: string;
  roles: string[];
}

// New JWT payload (context-based, canonical)
export interface ContextualJwtPayload {
  sub: string; // userId
  username: string;
  name: string;
  lastname: string;
  assignmentId: string;
  role: PrismaRole;
  iat?: number;
  exp?: number;
}

// User info response during login
export interface UserInfo {
  id: string;
  name: string | null;
  lastname: string | null;
  username: string;
}

// Membership info
export interface MembershipInfo {
  assignmentId: string;
  role: PrismaRole;
  status: string;
}
