const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const APP_FOLDER_NAME = '계부(My Ledger) 영수증';

export interface DriveFileResponse {
  id: string;
  name: string;
  webViewLink: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

/**
 * 전용 폴더를 찾거나 생성하고 폴더 ID를 반환합니다.
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  // 1. 폴더 검색
  const query = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResponse = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error('Drive Search Error:', searchResponse.status, errorText);
    if (searchResponse.status === 401 || searchResponse.status === 403) {
      throw new Error('구글 드라이브 접근 권한이 없거나 인증이 만료되었습니다.\n1. 로그아웃 후 다시 로그인하여 권한을 허용해주세요.\n2. 구글 클라우드 콘솔에서 "Google Drive API"가 활성화되어 있는지 확인해주세요.');
    }
    throw new Error(`Failed to search Drive folder: ${searchResponse.status}`);
  }
  
  const searchResult = await searchResponse.json();
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // 2. 폴더 생성
  const createResponse = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Drive Create Error:', createResponse.status, errorText);
    if (createResponse.status === 401 || createResponse.status === 403) {
      throw new Error('구글 드라이브 접근 권한이 없거나 인증이 만료되었습니다.\n1. 로그아웃 후 다시 로그인하여 권한을 허용해주세요.\n2. 구글 클라우드 콘솔에서 "Google Drive API"가 활성화되어 있는지 확인해주세요.');
    }
    throw new Error(`Failed to create Drive folder: ${createResponse.status}`);
  }
  
  const createResult = await createResponse.json();
  return createResult.id;
}

/**
 * 파일을 구글 드라이브에 업로드합니다.
 */
export async function uploadToDrive(accessToken: string, file: File, folderId: string): Promise<DriveFileResponse> {
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const uploadResponse = await fetch(`${UPLOAD_API_URL}?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink,webContentLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Drive Upload Error:', uploadResponse.status, errorText);
    if (uploadResponse.status === 401 || uploadResponse.status === 403) {
      throw new Error('구글 드라이브 접근 권한이 없거나 인증이 만료되었습니다.\n1. 로그아웃 후 다시 로그인하여 권한을 허용해주세요.\n2. 구글 클라우드 콘솔에서 "Google Drive API"가 활성화되어 있는지 확인해주세요.');
    }
    throw new Error(`Failed to upload to Drive: ${uploadResponse.status}`);
  }

  return await uploadResponse.json();
}

/**
 * 구글 드라이브 파일의 내용을 Blob으로 가져옵니다.
 */
export async function downloadDriveFile(accessToken: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to download file from Drive');
  }

  return await response.blob();
}

/**
 * URL에서 파일 ID를 추출합니다.
 */
export function extractFileId(url: string): string | null {
  // webViewLink: https://drive.google.com/file/d/FILE_ID/view
  // thumbnailLink: https://lh3.googleusercontent.com/drive-viewer/xxx=s1000
  // 직접 ID를 저장하는게 좋지만, 현재 URL로 저장되어 있으므로 패턴 매칭 시도
  const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (match) return match[1];
  return null;
}
