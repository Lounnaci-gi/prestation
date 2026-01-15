/**
 * Convertit un nombre en lettres en français
 * @param {number} number - Le nombre à convertir
 * @returns {string} - Le nombre en lettres
 */
export const numberToWords = (number) => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  // Gérer les cas particuliers
  if (number === 0) return 'zéro';

  // Extraire les parties entière et décimale
  const integerPart = Math.floor(number);
  const decimalPart = Math.round((number - integerPart) * 100);

  // Fonction interne pour convertir les nombres inférieurs à 1000
  const convertLessThanThousand = (num) => {
    let result = '';

    // Centaines
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;

      if (hundreds === 1) {
        result += 'cent';
      } else {
        result += units[hundreds] + ' cent';
      }

      if (remainder > 0) {
        result += ' ';
      }

      num = remainder;
    }

    // Dizaines et unités
    if (num >= 90) {
      if (num === 90) {
        result += 'quatre-vingt-dix';
      } else if (num === 91) {
        result += 'quatre-vingt-onze';
      } else if (num === 92) {
        result += 'quatre-vingt-douze';
      } else if (num === 93) {
        result += 'quatre-vingt-treize';
      } else if (num === 94) {
        result += 'quatre-vingt-quatorze';
      } else if (num === 95) {
        result += 'quatre-vingt-quinze';
      } else if (num === 96) {
        result += 'quatre-vingt-seize';
      } else if (num === 97) {
        result += 'quatre-vingt-dix-sept';
      } else if (num === 98) {
        result += 'quatre-vingt-dix-huit';
      } else if (num === 99) {
        result += 'quatre-vingt-dix-neuf';
      }
    } else if (num >= 80) {
      if (num === 80) {
        result += 'quatre-vingts';
      } else if (num === 81) {
        result += 'quatre-vingt-un';
      } else {
        result += 'quatre-vingt-' + units[num - 80];
      }
    } else if (num >= 70) {
      if (num === 70) {
        result += 'soixante-dix';
      } else if (num === 71) {
        result += 'soixante et onze';
      } else {
        result += 'soixante-' + teens[num - 70];
      }
    } else if (num >= 60) {
      if (num === 60) {
        result += 'soixante';
      } else {
        result += 'soixante-' + units[num - 60];
      }
    } else if (num >= 50) {
      if (num === 50) {
        result += 'cinquante';
      } else if (num === 51) {
        result += 'cinquante et un';
      } else {
        result += 'cinquante-' + units[num - 50];
      }
    } else if (num >= 40) {
      if (num === 40) {
        result += 'quarante';
      } else if (num === 41) {
        result += 'quarante et un';
      } else {
        result += 'quarante-' + units[num - 40];
      }
    } else if (num >= 30) {
      if (num === 30) {
        result += 'trente';
      } else if (num === 31) {
        result += 'trente et un';
      } else {
        result += 'trente-' + units[num - 30];
      }
    } else if (num >= 20) {
      if (num === 20) {
        result += 'vingt';
      } else if (num === 21) {
        result += 'vingt et un';
      } else {
        result += 'vingt-' + units[num - 20];
      }
    } else if (num >= 10) {
      result += teens[num - 10];
    } else {
      result += units[num];
    }

    return result.trim();
  };

  // Conversion du nombre principal
  if (integerPart === 0) {
    let result = 'zéro';
    if (decimalPart > 0) {
      result += ' virgule ' + convertLessThanThousand(decimalPart) + ' centimes';
    }
    return result;
  }

  let result = '';
  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remaining = integerPart % 1000;

  if (billions > 0) {
    if (billions === 1) {
      result += 'un milliard';
    } else {
      result += convertLessThanThousand(billions) + ' milliards';
    }
    if (millions + thousands + remaining > 0) result += ' ';
  }

  if (millions > 0) {
    if (millions === 1) {
      result += 'un million';
    } else {
      result += convertLessThanThousand(millions) + ' millions';
    }
    if (thousands + remaining > 0) result += ' ';
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'mille';
    } else {
      result += convertLessThanThousand(thousands) + ' mille';
    }
    if (remaining > 0) result += ' ';
  }

  if (remaining > 0) {
    result += convertLessThanThousand(remaining);
  }

  // Ajouter les décimales si présentes
  if (decimalPart > 0) {
    result += ' virgule ' + convertLessThanThousand(decimalPart) + ' centimes';
  }

  return result;
};

/**
 * Convertit un montant en lettres avec devise
 * @param {number} amount - Le montant à convertir
 * @returns {string} - Le montant en lettres avec devise
 */
export const amountToWords = (amount) => {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = '';
  if (integerPart > 0) {
    result += numberToWords(integerPart) + ' dinars';
  }

  if (decimalPart > 0) {
    if (integerPart > 0) {
      result += ' et ';
    }
    result += numberToWords(decimalPart) + ' centimes';
  }

  // Si le montant est 0, retourner "zéro dinars"
  if (amount === 0) {
    result = 'Zéro dinars';
  } else {
    // Capitaliser la première lettre
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  return result;
};