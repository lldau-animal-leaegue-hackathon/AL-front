import type { Metadata } from "next";

import { PageHeader } from "./components/PageHeader";
import { ProductSearch } from "./components/ProductSearch";
import { ScannerCta } from "./components/ScannerCta";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Add to My Shelf",
};

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Add to My Shelf" />

      <main className={styles.main}>
        <ProductSearch />
        <ScannerCta />
      </main>
    </>
  );
}
