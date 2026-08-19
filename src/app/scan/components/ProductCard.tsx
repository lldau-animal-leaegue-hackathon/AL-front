import Image from "next/image";

import { Icon } from "@/components/Icon";
import { stepIcon } from "@/lib/stepIcon";

import styles from "./ProductCard.module.css";

/**
 * 제품 카드 — 검색 결과·인기 제품이 같은 모양을 쓴다.
 *
 * ⛔ **가격을 표시하지 않는다.** 화해 실측(2026-08-18)에서 가격은 검색어에 따라 나오기도
 * 안 나오기도 했고, 나오더라도 정가가 아니라 사은품 묶음 "최저가"였다. 재현되지 않는 값을
 * 정가처럼 보여 줄 수 없다(시드에 남아 있던 `price` 도 이 규칙에 따라 화면에서 뺐다).
 *
 * ⚠️ `image` 에는 **공유해도 되는 이미지만** 넘긴다. 사용자가 직접 찍은 사진은
 * 내 선반에서만 보여 준다(`db/migrations/002_product_image.sql` 참조).
 */
type Props = {
  name: string;
  brand: string;
  /** 공유 이미지(data URL). 없으면 카테고리 아이콘으로 폴백한다. */
  image?: string;
  /** 아이콘 폴백을 고르는 데 쓴다. */
  category?: string;
  onSelect: () => void;
};

export function ProductCard({ name, brand, image, category, onSelect }: Props) {
  return (
    <li>
      <button type="button" className={styles.card} onClick={onSelect}>
        <div className={styles.thumb}>
          {image ? (
            // 이미 축소된 data URL 이라 next/image 최적화가 필요 없다.
            <Image
              src={image}
              alt=""
              width={72}
              height={72}
              unoptimized
              className={styles.image}
            />
          ) : (
            <Icon name={stepIcon(category ?? "")} filled />
          )}
        </div>

        <p className={styles.name}>{name}</p>
        <p className={styles.brand}>{brand}</p>
      </button>
    </li>
  );
}
