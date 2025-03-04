export class PhotosApi {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:7000') {
    this.baseUrl = baseUrl
  }
}
