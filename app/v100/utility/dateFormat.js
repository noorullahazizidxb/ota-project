
let self = {

    getGregorianMonth (prmMonth) {
        let month = '';
        switch (prmMonth) {
        case '1':
            month = "ژانویه";
            break;
        case '2':
            month = "فوریه";
            break;
        case '3':
            month = "مارس";
            break;
        case '4':
            month = "آوریل";
            break;
        case '5':
            month = "می";
            break;
        case '6':
            month = "ژوئن";
            break;
        case '7':
            month = "جولای";
            break;
        case '8':
            month = "آگوست";
            break;
        case '9':
            month = "سپتامبر";
            break;
        case '10':
            month = "اکتبر";
            break;
        case '11':
            month = "نوامبر";
            break;
        case '12':
            month = "اسفند";
            break;
        default:
            month = " ";
            break;
        }
        
        return month;
    },

    getPersianMonth (prmMonth) {
        let month = '';
        switch (prmMonth) {
        case '1':
            month = "فروردین";
            break;
        case '2':
            month = "اردیبهشت";
            break;
        case '3':
            month = "خرداد";
            break;
        case '4':
            month = "تیر";
            break;
        case '5':
            month = "مرداد";
            break;
        case '6':
            month = "شهریور";
            break;
        case '7':
            month = "مهر";
            break;
        case '8':
            month = "آبان";
            break;
        case '9':
            month = "آذر";
            break;
        case '10':
            month = "دی";
            break;
        case '11':
            month = "بهمن";
            break;
        case '12':
            month = "اسفند";
            break;
        default:
            month = " ";
            break;
        }
      
        return month;
    },

    getDayName (prmDay) {
        let day = '';
        switch (prmDay) {
        case 'Sun':
            day = "یکشنبه";
            break;
        case 'Mon':
            day = "دوشنبه";
            break;
        case 'Tue':
            day = "سه شنبه";
            break;
        case 'Wed':
            day = "چهارشنبه";
            break;
        case 'Thu':
            day = "پنجشنبه";
            break;
        case 'Fri':
            day = "جمعه";
            break;
        case 'Sat':
            day = "شنبه";
            break;
        default:
            day = " ";
            break;
        }
        
        return day;
    },
    getTimeFromMins(mins) {
  
        let hours = Math.floor(mins / 60);
        let minutes = mins % 60;
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        if (hours < 10) {
            hours = '0' + hours;
        }
      
        return hours + ':' + minutes;
    }
};


module.exports = self;