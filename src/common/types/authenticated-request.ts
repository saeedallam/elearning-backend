import { Role } from '@prisma/client';
export interface AuthenticatedRequest { user: { id: string; email: string; role: Role; isActive: boolean } }
