import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {Box, Chip, Typography} from '@material-ui/core';
import moment from 'moment';
import * as gqlDailyTracker from '../gql/dailyTracker';
import {DailyTrackerValues, DailyTrackerValues_dailyTrackerValues} from '../gql/__generated__/DailyTrackerValues';

interface DailyTrackersListProps {
    date: moment.Moment;
}

export const DailyTrackersList: React.FC<DailyTrackersListProps> = ({date}) => {
    const dateStr = date.format('YYYY-MM-DD');
    const {data, loading} = useQuery<DailyTrackerValues, {from: string; to: string}>(
        gqlDailyTracker.DailyTrackerValues,
        {
            variables: {from: dateStr, to: dateStr},
            fetchPolicy: 'cache-first',
        }
    );

    const values = (data && data.dailyTrackerValues) || [];

    if (loading || values.length === 0) {
        return null;
    }

    return (
        <Box mb={2} data-trackers-date={dateStr}>
            {values.map((v) => {
                const valueDisplay = getValueDisplay(v);
                const valueText = getValueText(v);
                return (
                    <Box key={v.id} display="flex" alignItems="center" mb={0.5} data-tracker-item>
                        <Box
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: v.tracker.color,
                                marginRight: 8,
                            }}
                        />
                        <Typography variant="body2" style={{marginRight: 8}} data-tracker-name>
                            {v.tracker.name}:
                        </Typography>
                        <span data-tracker-value style={{display: 'none'}}>{valueText}</span>
                        {valueDisplay}
                    </Box>
                );
            })}
        </Box>
    );
};

const getValueDisplay = (v: DailyTrackerValues_dailyTrackerValues) => {
    if (v.tracker.type === 'Boolean') {
        return v.boolValue ? (
            <Chip label="✓" size="small" style={{backgroundColor: '#4caf50', color: 'white'}} />
        ) : (
            <Chip label="✗" size="small" style={{backgroundColor: '#f44336', color: 'white'}} />
        );
    }
    if (v.tracker.type === 'Number') {
        return <Chip label={v.numberValue !== null ? v.numberValue.toString() : '-'} size="small" />;
    }
    if (v.tracker.type === 'Text') {
        return <Typography variant="body2" style={{fontStyle: 'italic'}}>
            {v.textValue || '-'}
        </Typography>;
    }
    return null;
};

const getValueText = (v: DailyTrackerValues_dailyTrackerValues) => {
    if (v.tracker.type === 'Boolean') {
        return v.boolValue ? '✓' : '✗';
    }
    if (v.tracker.type === 'Number') {
        return v.numberValue !== null ? v.numberValue.toString() : '-';
    }
    if (v.tracker.type === 'Text') {
        return v.textValue || '-';
    }
    return '';
};
