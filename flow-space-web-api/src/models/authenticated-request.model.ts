import { RequestUserModel } from './request-user.model';

export interface AuthenticatedRequestModel extends Request {
    user: RequestUserModel;
}
