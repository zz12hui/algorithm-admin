#!/bin/bash
set -e

IMAGE="algorithm-admin"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"

cd "$(dirname "$0")"

echo ">>> 构建镜像: ${IMAGE}:${TAG} (${PLATFORM})"
docker build --platform "${PLATFORM}" -t "${IMAGE}:${TAG}" .

echo ""
echo ">>> 镜像大小:"
docker images "${IMAGE}:${TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo ">>> 导出 tar 包..."
docker save "${IMAGE}:${TAG}" -o "${IMAGE}-${TAG}.tar"
ls -lh "${IMAGE}-${TAG}.tar"
echo ""
echo ">>> 完成。tar 包: ${IMAGE}-${TAG}.tar"

# 如需推送到私有仓库，取消下面注释并修改地址
# REGISTRY="harbor.your-company.com/project"
# docker tag "${IMAGE}:${TAG}" "${REGISTRY}/${IMAGE}:${TAG}"
# docker push "${REGISTRY}/${IMAGE}:${TAG}"
