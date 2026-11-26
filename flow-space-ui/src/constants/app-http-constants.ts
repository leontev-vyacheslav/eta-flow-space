export const HttpConstants = {
    Timeouts: {
        EmergencyRead: 10_000,
        AuthRefresh: 10_000,
    },
    Headers: {
        ContentTypeJson: {
            'Content-Type': 'application/json',
        },
        AcceptJson: {
            Accept: 'application/json',
        },
    },
    Methods:{
      Get: 'GET',
      Post: 'POST',
      Delete: 'DELETE',
      Put: 'PUT'
    },
    StatusCodes: {
        Ok: 200,
        Created: 201,
        Accepted: 202,
        BadRequest: 400,
        Unauthorized: 401,
        Forbidden: 403,
        NotFound: 404,
        Conflict: 409,
    },
};
