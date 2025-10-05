// Tailwind CSS 클래스 이름 유틸리티 함수
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 클래스 이름이 없는 경우 clsx를 직접 사용
export { clsx };