# 🧪 Feature Testing Guide: Advanced Product Management with Dynamic Pricing

## 🚀 Quick Start

### 1. Checkout the Feature Branch
```bash
git checkout feature/advanced-product-management-dynamic-pricing
npm install  # Install any new dependencies
```

### 2. Database Setup
```bash
# Apply the enhanced schema to your Supabase database
# Copy the contents of supabase/schema.sql and run in your Supabase SQL editor
# OR if you have direct database access:
psql -d your_database -f supabase/schema.sql
```

### 3. Start Development Server
```bash
npm run dev
```

## 🎯 Key Testing Areas

### 1. Enhanced Products Page (`/products`)
- **Catalog View**: Test the new product catalog with real-time pricing
- **Management View**: Access product management tools
- **Filtering**: Try category, price range, and search filters
- **View Modes**: Switch between grid and list views

### 2. API Endpoints Testing

#### Product Catalog with Pricing
```bash
# Basic product listing
curl "http://localhost:3000/api/products"

# With pricing calculations
curl "http://localhost:3000/api/products?include_pricing=true&reseller_tier=gold&territory=UK&quantity=5"

# With filters
curl "http://localhost:3000/api/products?search=software&min_price=1000&max_price=50000"
```

#### Pricing Calculations
```bash
# Single product pricing
curl "http://localhost:3000/api/products/pricing?product_id=PRODUCT_ID&reseller_tier=gold&territory=UK&quantity=10"

# Bulk pricing calculation
curl -X POST "http://localhost:3000/api/products/pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": ["product-id-1", "product-id-2"],
    "reseller_tier": "gold",
    "territory": "UK",
    "quantity": 10,
    "is_deal_registration": true,
    "deal_value": 50000
  }'
```

#### Categories
```bash
# Get categories with hierarchy
curl "http://localhost:3000/api/products/categories?include_hierarchy=true&include_product_count=true"
```

### 3. Pricing Engine Scenarios

#### Test Volume Discounts
- Order 1-4 units: Standard pricing
- Order 5-9 units: 5% discount
- Order 10-24 units: 10% discount  
- Order 25+ units: 15% discount

#### Test Reseller Tier Pricing
- **Bronze**: Standard list price
- **Silver**: Moderate discounts
- **Gold**: Best pricing tiers

#### Test Territory Pricing
- **UK**: Standard pricing
- **International**: 20% markup (sample data)

#### Test Deal Registration
- Large deals (>£50k): Special pricing available
- Must be eligible reseller tier

### 4. Database Verification

Check that sample data was inserted correctly:
```sql
-- Check product categories
SELECT * FROM product_categories ORDER BY sort_order;

-- Check enhanced products
SELECT id, name, sku, status, list_price FROM products;

-- Check volume discounts
SELECT * FROM volume_discounts;

-- Check pricing tiers
SELECT * FROM product_pricing_tiers;
```

## 🔍 What to Look For

### ✅ Expected Behaviors
- Real-time pricing calculations in the catalog
- Proper discount stacking (volume + tier + promotional)
- Territory-based pricing adjustments
- Product availability restrictions
- Hierarchical category navigation
- Responsive design across devices

### ⚠️ Potential Issues to Report
- Pricing calculation errors or inconsistencies
- Performance issues with large product sets
- UI/UX problems in the catalog interface
- API response errors or timeouts
- Database constraint violations
- Missing or incorrect sample data

## 📊 Sample Data Overview

The implementation includes:
- **5 main product categories** with subcategories
- **5 sample products** with enhanced information
- **Volume discount tiers** for different quantities
- **Deal registration pricing** for eligible deals
- **Territory pricing** for international sales
- **Promotional pricing** examples

## 🐛 Reporting Issues

When reporting issues, please include:
1. **Steps to reproduce** the problem
2. **Expected vs actual behavior**
3. **Browser/device information**
4. **Console errors** (if any)
5. **API response examples** (for API issues)

## 🚀 Performance Testing

### Load Testing
- Test with 100+ products in catalog
- Verify pricing calculations with multiple products
- Check search performance with large datasets

### Responsiveness
- Test on mobile devices
- Verify tablet layouts
- Check desktop responsiveness

## 🔗 Useful Links

- **GitHub Issue**: [#1 - Advanced Product Management Feature](https://github.com/drewbrogers2025/deal-registration-system/issues/1)
- **Feature Branch**: `feature/advanced-product-management-dynamic-pricing`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`

## 📞 Support

If you encounter any issues during testing:
1. Check the console for error messages
2. Verify database schema was applied correctly
3. Ensure all dependencies are installed
4. Review the implementation summary for technical details

---

**Happy Testing!** 🎉

This feature represents a significant enhancement to the deal registration system with sophisticated pricing capabilities that will benefit both administrators and resellers.
