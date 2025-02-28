import userService from '../services/userService.js';

class UserController {
  // @desc    Obtener todos los usuarios
  // @route   GET /api/users
  // @access  Private/Admin
  async getUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();

      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Obtener un usuario por ID
  // @route   GET /api/users/:id
  // @access  Private/Admin
  async getUser(req, res, next) {
    try {
      const user = await userService.getCurrentUser(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `No se encontró usuario con id ${req.params.id}`
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Actualizar usuario
  // @route   PUT /api/users/:id
  // @access  Private/Admin
  async updateUser(req, res, next) {
    try {
      // Evitar actualizar algunos campos sensibles
      const userData = { ...req.body };
      delete userData.password; // La contraseña debe cambiarse a través de la API de autenticación

      const user = await userService.updateUser(req.params.id, userData);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }

  // @desc    Eliminar usuario
  // @route   DELETE /api/users/:id
  // @access  Private/Admin
  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);

      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();