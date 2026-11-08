const cheerio = require('cheerio');

function parseDistricts(html) {
  try {
    const $ = cheerio.load(html);
    const districts = [];

    $('select[name="vlStrahSectorID"] option, select option').each((_, el) => {
      const value = $(el).attr('value');
      const text = $(el).text().trim();

      if (value && value !== '0' && text) {
        districts.push({ id: value, name: text });
      }
    });

    if (districts.length === 0) {
      return {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Не удалось обработать данные участков.'
        }
      };
    }

    return { ok: true, data: districts };
  } catch (err) {
    console.error('HTML Parse Error (Districts):', err);
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
      }
    };
  }
}

function parseSpecialties(html) {
  try {
    const $ = cheerio.load(html);
    const specialties = [];

    $('input[type="checkbox"]').each((_, el) => {
      const name = $(el).attr('name') || '';
      if (!name.startsWith('Check')) return;

      const text =
        $(el).closest('label').text().trim() ||
        $(el).nextAll('font').first().text().trim() ||
        name;

      specialties.push({ id: name, name: text });
    });

    if (specialties.length === 0) {
      return {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Не удалось обработать данные специальностей.'
        }
      };
    }

    return { ok: true, data: specialties };
  } catch (err) {
    console.error('HTML Parse Error (Specialties):', err);
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
      }
    };
  }
}

function parseTalons(html, filters = {}) {
  try {
    const $ = cheerio.load(html);
    const talons = [];

    const headerRow = $('form[name="talony"] tr, form tr, tr').filter((_, row) =>
      $(row).find('input[type="checkbox"]').length === 0 &&
      $(row).text().trim().length > 0
    ).first();
    const headerText = headerRow.text().trim() || 'Врач не указан';
    const headerWithoutAddress = headerText.replace(/\s*\([^)]*\)/g, '');
    const headerParts = headerWithoutAddress.split(',').map((part) => part.trim()).filter(Boolean);
    const doctor = headerParts[0] || headerText;
    const parsedSpecialty = headerParts.slice(1)
      .find((part) => !/^каб(?:инет)?\.?/i.test(part)) || '';
    const cabinet = headerText.match(/каб(?:инет)?\.?\s*№?\s*([\w/-]+)/i)?.[1] || 'Уточняется';

    $('tr').each((_, row) => {
      const $row = $(row);
      const dateTd = $row.find('td').eq(0).text().trim();
      const timeCell = $row.find('td').eq(1);
      const checkbox = timeCell.find('input[type="checkbox"]');

      if (!dateTd || checkbox.length === 0) return;

      const talonId = checkbox.attr('name') || '';
      const timeText =
        timeCell.find('font').first().text().trim() ||
        timeCell.text().trim();

      if (!talonId || !timeText) return;

      talons.push({
        id: talonId,
        date: dateTd,
        time: timeText,
        doctor,
        specialty: parsedSpecialty || filters.specialtyName || '',
        district: filters.districtName || '',
        cabinet,
        isAvailable: true
      });
    });

    if (talons.length === 0 &&
        $('form[name="talony"], table').length > 0 &&
        $('input[type="checkbox"][name^="Check"]').length === 0) {
      return { ok: true, data: [] };
    }

    if (talons.length === 0) {
      return {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
        }
      };
    }

    return { ok: true, data: talons };
  } catch (err) {
    console.error('HTML Parse Error (Talons):', err);
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Не удалось обработать данные с сайта. Возможно, изменилась структура страницы.'
      }
    };
  }
}

module.exports = { parseDistricts, parseSpecialties, parseTalons };
