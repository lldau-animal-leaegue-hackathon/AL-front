import Image from "next/image";

import { Icon } from "@/components/Icon";

import styles from "./ProductCard.module.css";

type Props = {
  name: string;
  brand: string;
  /** 없으면 색 원 + 아이콘으로 대체한다 (인기 상품 목업처럼) */
  image?: string;
  price?: number;
  href?: string;
};

export function ProductCard({ name, brand, image, price, href }: Props) {
  const body = (
    <>
      <div className={styles.thumb}>
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="64px"
            className={styles.image}
          />
        ) : (
          <Icon name="water_drop" filled />
        )}
      </div>

      <p className={styles.name}>{name}</p>
      <p className={styles.brand}>{brand}</p>
      {price !== undefined && (
        <p className={styles.price}>{price.toLocaleString("ko-KR")}원</p>
      )}
    </>
  );

  if (!href) return <li className={styles.card}>{body}</li>;

  return (
    <li>
      {/* 네이버 상품 페이지는 외부 사이트라 새 탭으로 연다 */}
      <a
        className={styles.card}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    </li>
  );
}
