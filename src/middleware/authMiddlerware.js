const { supabase } = require('../config/supabase');

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
  try {
    // Verificar la sesión de Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'No estás autorizado para acceder a este recurso'
      });
    }

    // Verificar el token JWT de Supabase (está en session.access_token)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Obtener información adicional del usuario desde la tabla de perfiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el perfil del usuario'
      });
    }

    // Agregar el usuario y su rol al objeto de solicitud
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      // Incluir los metadatos del usuario si existen
      ...user.user_metadata
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'No estás autorizado para acceder a este recurso',
      error: error.message
    });
  }
};

// Verificar roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.role} no está autorizado para acceder a este recurso`
      });
    }
    next();
  };
};