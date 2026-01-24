import Swal from 'sweetalert2';

// Importer les styles CSS de base pour les animations
import 'sweetalert2/dist/sweetalert2.min.css';

// Variable globale pour éviter les appels multiples
let isProcessingAlert = false;
let lastAlertTime = 0;

// Service centralisé pour les alertes
const AlertService = {
  // Succès
  success(title, text = '') {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0369a1',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: true,
      // Animations douces
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-icon-hide'
      }
    });
  },

  // Erreur
  error(title, text = '') {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc2626',
      // Animations douces
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-icon-hide'
      }
    });
  },

  // Avertissement
  warning(title, text = '') {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#f59e0b',
      // Animations douces
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-icon-hide'
      }
    });
  },

  // Info
  info(title, text = '') {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3b82f6',
      // Animations douces
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show',
        icon: 'swal2-icon-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide',
        icon: 'swal2-icon-hide'
      }
    });
  },

  // Confirmation avec protection contre les appels multiples
  async confirm(title, text = '', confirmText = 'Confirmer', cancelText = 'Annuler') {
    // Protection : vérifier si une alerte SweetAlert est déjà affichée
    const swalContainer = document.querySelector('.swal2-container');
    if (swalContainer) {
      // console.debug('Alerte ignorée : SweetAlert déjà affichée');
      return { isConfirmed: false };
    }
    
    // Protection temporelle : ignorer les appels trop rapprochés
    const now = Date.now();
    if (now - lastAlertTime < 200) {
      return { isConfirmed: false };
    }
    
    // Protection contre les appels multiples
    if (isProcessingAlert) {
      return { isConfirmed: false };
    }
    
    isProcessingAlert = true;
    lastAlertTime = now;
    
    try {
      const result = await Swal.fire({
        title,
        text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: '#0369a1',
        cancelButtonColor: '#6b7280',
        // Animations douces
        showClass: {
          popup: 'swal2-show',
          backdrop: 'swal2-backdrop-show',
          icon: 'swal2-icon-show'
        },
        hideClass: {
          popup: 'swal2-hide',
          backdrop: 'swal2-backdrop-hide',
          icon: 'swal2-icon-hide'
        }
      });
      
      return result;
    } finally {
      isProcessingAlert = false;
    }
  },

  // Fermer l'alerte active
  close() {
    Swal.close();
  }
};

export default AlertService;