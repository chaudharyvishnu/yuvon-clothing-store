import ProductCard from "../ProductCard";

function ProductGrid({
  products,
  openProduct,
  handleAddToCart,
  handleWishlist,
  isWishlisted,
  isWishlistUpdating,
  isAuthenticated,
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onOpen={() => openProduct(product.id)}
          onAddToCart={handleAddToCart}
          onWishlist={handleWishlist}
          wishlisted={isWishlisted(product.id)}
          wishlistUpdating={
            isWishlistUpdating?.(product.id) ||
            false
          }
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

export default ProductGrid;