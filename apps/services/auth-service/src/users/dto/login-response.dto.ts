export class LoginResponseDto {
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  accessToken: string;
}
