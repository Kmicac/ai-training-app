const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Clase para manejar operaciones de usuario con Supabase
class UserService {
  /**
   * Registra un nuevo usuario
   */
  async registerUser({ name, email, password, role = 'user' }) {
    // Registrar usuario con autenticación de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    });

    if (authError) throw authError;

    // Crear entrada en la tabla de perfiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        email,
        role
      });

    if (profileError) throw profileError;

    return {
      id: authData.user.id,
      email: authData.user.email,
      name,
      role
    };
  }

  /**
   * Inicia sesión de un usuario
   */
  async loginUser({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Obtener datos de perfil adicionales
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profileData.name,
        role: profileData.role
      },
      session: data.session
    };
  }

  /**
   * Obtiene el usuario actual
   */
  async getCurrentUser(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtiene todos los usuarios (admin)
   */
  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, created_at');

    if (error) throw error;
    return data;
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(userId, userData) {
    // Actualizar metadatos de autenticación si es necesario
    if (userData.name || userData.role) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            name: userData.name,
            role: userData.role
          }
        }
      );

      if (authError) throw authError;
    }

    // Actualizar perfil
    const { data, error } = await supabase
      .from('profiles')
      .update(userData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(userId) {
    // Eliminar usuario de autenticación
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;
    
    // El perfil se eliminará automáticamente si has configurado RLS y triggers

    return { success: true };
  }

  /**
   * Genera un token JWT (para uso con middleware personalizado si es necesario)
   */
  generateToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }
}

module.exports = new UserService();