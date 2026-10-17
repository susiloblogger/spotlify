/**
 * StyleBuilder for Spotlify OSD
 * Converts GSettings values into dynamic St CSS strings.
 */

export class StyleBuilder {
    /**
     * Builds CSS for the OSD background card container.
     * @param {Gio.Settings} settings
     * @returns {string}
     */
    static buildBoxStyle(settings) {
        const direction = settings.get_string('gradient-direction') || 'horizontal';
        const startColor = settings.get_string('gradient-start') || 'rgba(18, 24, 21, 0.94)';
        const endColor = settings.get_string('gradient-end') || 'rgba(23, 33, 28, 0.94)';
        const borderRadius = settings.get_int('border-radius') || 18;
        const padding = settings.get_int('padding') || 12;
        const maxWidth = settings.get_int('max-width') || 750;

        let css = '';
        if (direction === 'none') {
            css += `background-color: ${startColor};`;
        } else {
            css += `
                background-gradient-direction: ${direction};
                background-gradient-start: ${startColor};
                background-gradient-end: ${endColor};
            `;
        }

        css += `
            border-radius: ${borderRadius}px;
            padding: ${padding}px;
            min-width: 440px;
            max-width: ${maxWidth}px;
        `;

        return css.replace(/\s+/g, ' ').trim();
    }

    /**
     * Builds CSS for individual lyric label.
     * @param {Gio.Settings} settings
     * @param {'prev' | 'active' | 'next' | 'nextNext'} lineType
     * @returns {string}
     */
    static buildLabelStyle(settings, lineType) {
        const fontFamily = settings.get_string('font-family') || 'Cantarell';
        const baseFontSize = settings.get_int('font-size') || 15;
        const fontBold = settings.get_boolean('font-bold');
        const activeColor = settings.get_string('active-color') || 'rgba(239, 253, 236, 1.0)';
        const inactiveColor = settings.get_string('inactive-color') || 'rgba(255, 255, 255, 0.55)';
        const textAlign = settings.get_string('text-align') || 'left';

        let fontSize;
        let color;
        let fontWeight = 'normal';

        if (lineType === 'active') {
            fontSize = baseFontSize;
            color = activeColor;
            if (fontBold) {
                fontWeight = 'bold';
            }
        } else if (lineType === 'next') {
            fontSize = Math.max(10, Math.round(baseFontSize * 0.75));
            color = inactiveColor;
        } else if (lineType === 'nextNext') {
            fontSize = Math.max(9, Math.round(baseFontSize * 0.68));
            color = 'rgba(255, 255, 255, 0.32)';
        } else {
            // prev fallback
            fontSize = Math.max(10, Math.round(baseFontSize * 0.75));
            color = inactiveColor;
        }

        let css = `
            font-family: '${fontFamily}', sans-serif;
            font-size: ${fontSize}pt;
            font-weight: ${fontWeight};
            color: ${color};
            text-align: ${textAlign};
        `;

        return css.replace(/\s+/g, ' ').trim();
    }
}
