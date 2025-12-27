import * as React from 'react';
import {Paper, Table, TableBody, TableCell, TableHead, TableRow} from '@material-ui/core';
import {useQuery} from '@apollo/react-hooks';
import * as gqlDailyTracker from '../gql/dailyTracker';
import {DailyTrackers} from '../gql/__generated__/DailyTrackers';
import {DailyTrackerValues, DailyTrackerValues_dailyTrackerValues} from '../gql/__generated__/DailyTrackerValues';
import {TrackerValueCell} from './TrackerValueCell';
import {CenteredSpinner} from '../common/CenteredSpinner';
import moment from 'moment';

interface DailyTrackerTableProps {
    dateRange: { start: moment.Moment; end: moment.Moment };
}

export const DailyTrackerTable: React.FC<DailyTrackerTableProps> = ({dateRange}) => {
    const {data: trackersData, loading: trackersLoading} = useQuery<DailyTrackers>(gqlDailyTracker.DailyTrackers);

    // Generate date columns for the range - memoize to prevent recreating on every render
    const dates = React.useMemo(() => {
        const result: string[] = [];
        let current = dateRange.start.clone();
        while (current.isSameOrBefore(dateRange.end, 'day')) {
            result.push(current.format('YYYY-MM-DD'));
            current.add(1, 'day');
        }
        return result;
    }, [dateRange.start, dateRange.end]);

    const from = dates[0];
    const to = dates[dates.length - 1];

    const {data: valuesData, loading: valuesLoading} = useQuery<
        DailyTrackerValues,
        {from: string; to: string}
    >(gqlDailyTracker.DailyTrackerValues, {
        variables: {from, to},
        fetchPolicy: 'cache-and-network',
    });

    const trackers = (trackersData && trackersData.dailyTrackers) || [];
    const values = (valuesData && valuesData.dailyTrackerValues) || [];

    // Limit to 7 trackers to prevent table from being too tall
    const displayTrackers = React.useMemo(() => trackers.slice(0, 7), [trackers]);

    // Create a map of trackerId + date -> value
    const valueMap = React.useMemo(() => {
        const map = new Map<string, DailyTrackerValues_dailyTrackerValues>();
        values.forEach((v) => {
            map.set(`${v.trackerId}-${v.date}`, v);
        });
        return map;
    }, [values]);

    // Don't show anything while loading or if no trackers exist
    if (trackersLoading || !trackersData || !trackersData.dailyTrackers || trackersData.dailyTrackers.length === 0) {
        return null;
    }

    if (valuesLoading && values.length === 0) {
        return (
            <Paper style={{marginBottom: 10, padding: 10}}>
                <CenteredSpinner />
            </Paper>
        );
    }

    return (
        <Paper style={{marginBottom: 10, padding: 10}}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Tracker</TableCell>
                        {dates.map((date) => (
                            <TableCell key={date} align="center" style={{padding: '4px 8px'}}>
                                {moment(date).format('ddd DD')}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {displayTrackers.map((tracker) => (
                        <TableRow key={tracker.id}>
                            <TableCell component="th" scope="row">
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <div
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor: tracker.color,
                                            marginRight: 8,
                                        }}
                                    />
                                    {tracker.name}
                                </div>
                            </TableCell>
                            {dates.map((date) => (
                                <TableCell key={date} align="center" style={{padding: '4px 8px'}}>
                                    <TrackerValueCell
                                        tracker={tracker}
                                        value={valueMap.get(`${tracker.id}-${date}`)}
                                        date={date}
                                        from={from}
                                        to={to}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
};
