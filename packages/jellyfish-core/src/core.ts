export class JellyfishCore {
  // TODO(fuxingloh): promise based client
  // TODO(fuxingloh): browser support
  // TODO(fuxingloh): protocol adapter
  // TODO(fuxingloh): interceptors
  // TODO(fuxingloh): error handling
  private address: string

  constructor(host: string, protocol: string) {
    this.address = `${protocol}:${host}`
  }
}