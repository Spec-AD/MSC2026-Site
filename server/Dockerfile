# 1. 使用轻量级的 Node.js 镜像作为基础
# 使用 node:18-alpine 或 node:20-alpine (Alpine版本体积极小，部署最快)
FROM node:18-alpine

# 2. 设置环境变量
# 显式声明端口为 5000，确保程序和 Zeabur 的设置同步
ENV NODE_ENV=production
ENV PORT=5000

# 3. 创建并设置工作目录
WORKDIR /app

# 4. 首先复制依赖描述文件
# 这样做可以利用 Docker 的缓存机制，只要 package.json 没变，就不需要重新安装依赖
COPY package*.json ./

# 5. 安装生产环境依赖
# --production 参数会忽略 devDependencies（如 nodemon），减小包体积
RUN npm install --production

# 6. 复制项目所有剩余文件
COPY . .

# 7. 告知容器在运行时需要监听的端口
EXPOSE 5000

# 8. 启动命令
# 必须确保你的 package.json 中定义了 "start": "node server.js"
CMD ["npm", "start"]