export interface EventListener<T> {
  next(): Promise<T>;
  close(): void;
}
