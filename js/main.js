// 初始化富文本编辑器
var quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['image', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }]
        ]
    }
});

// 初始化数据
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([]));
}
if (!localStorage.getItem('posts')) {
    localStorage.setItem('posts', JSON.stringify([]));
}

let currentUser = null;
const POSTS_PER_PAGE = 5;
let currentPage = 1;
let currentTab = 'posts';

// 注册功能
function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;

    if (!username || !password || !email) {
        alert('请填写完整信息！');
        return;
    }

    if (!email.includes('@')) {
        alert('请输入有效的电子邮件地址！');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users'));
    if (users.some(user => user.username === username)) {
        alert('用户名已存在！');
        return;
    }

    users.push({
        username,
        password: btoa(password), // 简单的密码编码
        email,
        avatar: null,
        favorites: []
    });
    localStorage.setItem('users', JSON.stringify(users));
    alert('注册成功！');
}

// 登录功能
function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => 
        u.username === username && 
        btoa(password) === u.password
    );

    if (user) {
        currentUser = user;
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('user-section').classList.remove('hidden');
        document.getElementById('current-user').textContent = `${username}`;
        if (user.avatar) {
            document.getElementById('user-avatar').src = user.avatar;
        }
        loadPosts();
    } else {
        alert('用户名或密码错误！');
    }
}

// 更新头像
function updateAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatar = e.target.result;
            document.getElementById('user-avatar').src = avatar;
            
            const users = JSON.parse(localStorage.getItem('users'));
            const user = users.find(u => u.username === currentUser.username);
            user.avatar = avatar;
            localStorage.setItem('users', JSON.stringify(users));
            currentUser = user;
        };
        reader.readAsDataURL(file);
    }
}

// 切换标签页
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    loadPosts();
}

// 创建帖子
function createPost() {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    const title = document.getElementById('post-title').value;
    const content = quill.root.innerHTML;
    const category = document.getElementById('post-category').value;

    if (!title || !content || !category) {
        alert('请填写完整信息！');
        return;
    }

    const posts = JSON.parse(localStorage.getItem('posts'));
    posts.push({
        id: Date.now(),
        title,
        content,
        category,
        author: currentUser.username,
        authorAvatar: currentUser.avatar,
        comments: [],
        likes: [],
        favorites: [],
        timestamp: new Date().toLocaleString()
    });

    localStorage.setItem('posts', JSON.stringify(posts));
    document.getElementById('post-title').value = '';
    quill.setText('');
    loadPosts();
}

// 点赞功能
function toggleLike(postId) {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    const posts = JSON.parse(localStorage.getItem('posts'));
    const post = posts.find(p => p.id === postId);
    const likeIndex = post.likes.indexOf(currentUser.username);

    if (likeIndex === -1) {
        post.likes.push(currentUser.username);
    } else {
        post.likes.splice(likeIndex, 1);
    }

    localStorage.setItem('posts', JSON.stringify(posts));
    loadPosts();
}

// 收藏功能
function toggleFavorite(postId) {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === currentUser.username);
    const favIndex = user.favorites.indexOf(postId);

    if (favIndex === -1) {
        user.favorites.push(postId);
    } else {
        user.favorites.splice(favIndex, 1);
    }

    localStorage.setItem('users', JSON.stringify(users));
    currentUser = user;
    loadPosts();
}

// 搜索帖子
function searchPosts() {
    loadPosts();
}

// 按分类筛选
function filterByCategory() {
    loadPosts();
}

// 加载帖子列表
function loadPosts() {
    const postsContainer = document.getElementById('posts-container');
    let posts = JSON.parse(localStorage.getItem('posts'));
    
    // 搜索过滤
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;

    // 标签页过滤
    if (currentTab === 'myPosts') {
        posts = posts.filter(post => post.author === currentUser.username);
    } else if (currentTab === 'favorites' && currentUser) {
        posts = posts.filter(post => currentUser.favorites.includes(post.id));
    }

    // 搜索和分类过滤
    posts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm) ||
                            post.content.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || post.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // 分页
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);

    // 渲染帖子
    postsContainer.innerHTML = paginatedPosts.map(post => `
        <div class="post">
            <div class="post-header">
                <img src="${post.authorAvatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/></svg>'}" 
                     class="avatar-small" alt="作者头像">
                <span>${post.author}</span>
                <span class="category-tag">[${post.category}]</span>
            </div>
            <h3>${post.title}</h3>
            <div class="post-content">${post.content}</div>
            <small>${post.timestamp}</small>
            
            <div class="reaction-buttons">
                <div class="reaction-button ${post.likes.includes(currentUser?.username) ? 'active' : ''}"
                     onclick="toggleLike(${post.id})">
                    👍 ${post.likes.length}
                </div>
                <div class="reaction-button ${currentUser?.favorites.includes(post.id) ? 'active' : ''}"
                     onclick="toggleFavorite(${post.id})">
                    ⭐ 收藏
                </div>
            </div>

            <div class="comments">
                <h4>评论 (${post.comments.length})</h4>
                ${post.comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.authorAvatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/></svg>'}" 
                             class="avatar-small" alt="评论者头像">
                        <p>${comment.content}</p>
                        <small>${comment.author} - ${comment.timestamp}</small>
                        ${currentUser?.username === comment.author ? 
                            `<button onclick="deleteComment(${post.id}, ${comment.id})">删除</button>` : 
                            ''}
                    </div>
                `).join('')}
                ${currentUser ? `
                    <div class="comment-form">
                        <input type="text" id="comment-${post.id}" placeholder="添加评论">
                        <button onclick="addComment(${post.id})">评论</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    // 更新分页控件
    updatePagination(totalPages);
}

// 更新分页控件
function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    let paginationHTML = '';
    
    if (currentPage > 1) {
        paginationHTML += `<button onclick="changePage(${currentPage - 1})">上一页</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button class="${i === currentPage ? 'active' : ''}"
                    onclick="changePage(${i})">${i}</button>
        `;
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${currentPage + 1})">下一页</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    currentPage = page;
    loadPosts();
}

// 添加评论
function addComment(postId) {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    const commentContent = document.getElementById(`comment-${postId}`).value;
    if (!commentContent) {
        alert('请输入评论内容！');
        return;
    }

    const posts = JSON.parse(localStorage.getItem('posts'));
    const post = posts.find(p => p.id === postId);
    post.comments.push({
        id: Date.now(),
        content: commentContent,
        author: currentUser.username,
        authorAvatar: currentUser.avatar,
        timestamp: new Date().toLocaleString()
    });

    localStorage.setItem('posts', JSON.stringify(posts));
    loadPosts();
}

// 删除评论
function deleteComment(postId, commentId) {
    const posts = JSON.parse(localStorage.getItem('posts'));
    const post = posts.find(p => p.id === postId);
    post.comments = post.comments.filter(c => c.id !== commentId);
    localStorage.setItem('posts', JSON.stringify(posts));
    loadPosts();
}

// 登出功能
function logout() {
    currentUser = null;
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('user-section').classList.add('hidden');
    loadPosts();
}

// 初始加载
loadPosts();