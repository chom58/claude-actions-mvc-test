const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'このメールアドレスは既に登録されています'
      });
    }

    const user = await User.create({
      username,
      email,
      password
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'ユーザー登録が完了しました',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'ユーザー登録中にエラーが発生しました'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email }
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'ログインに成功しました',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'ログイン中にエラーが発生しました'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [{
        association: 'posts',
        attributes: ['id', 'title', 'published', 'createdAt']
      }]
    });

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'プロフィール取得中にエラーが発生しました'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'このメールアドレスは既に使用されています'
        });
      }
    }

    await user.update({
      username: username || user.username,
      email: email || user.email
    });

    res.json({
      message: 'プロフィールが更新されました',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'プロフィール更新中にエラーが発生しました'
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません'
      });
    }

    await user.destroy();

    res.json({
      message: 'アカウントが削除されました'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'アカウント削除中にエラーが発生しました'
    });
  }
};