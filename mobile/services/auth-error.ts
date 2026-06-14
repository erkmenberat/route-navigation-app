import axios from 'axios';

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export function getAuthErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return 'Unknown issue: An unexpected error happened.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'Backend Server not Started or Issue: The request timed out.';
  }

  if (!error.response) {
    return 'Backend Server not Started or Issue: The app cannot reach the backend.';
  }

  const status = error.response.status;
  const serverMessage = getServerMessage(error.response.data);

  if (status === 400) {
    return `Wrong Input: ${serverMessage ?? 'Please check your email, password, and required fields.'}`;
  }

  if (status === 401 || status === 403) {
    return `Wrong Input: ${serverMessage ?? 'Email or password is incorrect.'}`;
  }

  if (status === 409) {
    return `Wrong Input: ${serverMessage ?? 'The account data conflicts with an existing user.'}`;
  }

  if (status === 503 || serverMessage?.toLowerCase().includes('database')) {
    return `Database Connection refused: ${serverMessage ?? 'Start the database and check DATABASE_URL.'}`;
  }

  if (status >= 500) {
    return `Backend Server not Started or Issue: ${serverMessage ?? 'The backend returned an internal error.'}`;
  }

  return serverMessage ?? `Request failed with status ${status}.`;
}

function getServerMessage(data: ApiErrorBody | undefined): string | undefined {
  if (!data) {
    return undefined;
  }

  if (Array.isArray(data.message)) {
    return data.message.join(' ');
  }

  return data.message ?? data.error;
}
