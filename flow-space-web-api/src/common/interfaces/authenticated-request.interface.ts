import { RequestUser } from './request-user.interface';

export interface AuthenticatedRequest extends Request {
    user: RequestUser;
}
