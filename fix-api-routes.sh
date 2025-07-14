#!/bin/bash

echo "🔧 Fixing API route parameter types for Next.js 15..."

# Fix all API routes with dynamic parameters
find src/app/api -name "*.ts" -exec sed -i 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' {} \;
find src/app/api -name "*.ts" -exec sed -i 's/const resellerId = params\.id/const { id: resellerId } = await params/g' {} \;
find src/app/api -name "*.ts" -exec sed -i 's/const dealId = params\.id/const { id: dealId } = await params/g' {} \;
find src/app/api -name "*.ts" -exec sed -i 's/const id = params\.id/const { id } = await params/g' {} \;

echo "✅ All API routes fixed!"
