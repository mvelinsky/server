import * as React from 'react';
import {TextField, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Button} from '@material-ui/core';
import {useMutation} from '@apollo/react-hooks';
import * as gqlDailyTracker from '../gql/dailyTracker';
import {SetDailyTrackerValue, SetDailyTrackerValueVariables} from '../gql/__generated__/SetDailyTrackerValue';
import {DailyTrackers_dailyTrackers} from '../gql/__generated__/DailyTrackers';
import {DailyTrackerValues_dailyTrackerValues} from '../gql/__generated__/DailyTrackerValues';

interface TrackerValueCellProps {
    tracker: DailyTrackers_dailyTrackers;
    value: DailyTrackerValues_dailyTrackerValues | undefined;
    date: string;
    from: string;
    to: string;
}

export const TrackerValueCell: React.FC<TrackerValueCellProps> = ({tracker, value, date, from, to}) => {

    const [setValue] = useMutation<SetDailyTrackerValue, SetDailyTrackerValueVariables>(
        gqlDailyTracker.SetDailyTrackerValue,
        {
            update: (cache, {data}) => {
                if (!data || !data.setDailyTrackerValue) {
                    return;
                }
                // Read existing data from cache
                const existing = cache.readQuery<{
                    dailyTrackerValues: DailyTrackerValues_dailyTrackerValues[];
                }>({
                    query: gqlDailyTracker.DailyTrackerValues,
                    variables: {from, to},
                });

                if (existing && existing.dailyTrackerValues) {
                    // Update the cache with the new/updated value
                    const newValue = data.setDailyTrackerValue;
                    const updated = existing.dailyTrackerValues.filter(
                        v => !(v.trackerId === newValue.trackerId && v.date === newValue.date)
                    );
                    updated.push(newValue);

                    cache.writeQuery({
                        query: gqlDailyTracker.DailyTrackerValues,
                        variables: {from, to},
                        data: {dailyTrackerValues: updated},
                    });
                }
            },
        }
    );

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [textValue, setTextValue] = React.useState((value && value.textValue) || '');

    // Number input local state - always declared, only used for Number type
    const numValue = value && value.numberValue;
    const [localValue, setLocalValue] = React.useState(
        numValue !== undefined && numValue !== null ? String(numValue) : ''
    );

    // Update local state when the value prop changes (e.g., from cache update)
    React.useEffect(() => {
        setLocalValue(numValue !== undefined && numValue !== null ? String(numValue) : '');
    }, [numValue]);

    // Boolean: Checkbox for quick toggle
    if (tracker.type === 'Boolean') {
        const checked = (value && value.boolValue) || false;
        return (
            <Checkbox
                checked={checked}
                onChange={(e) => {
                    setValue({
                        variables: {
                            trackerId: tracker.id,
                            date,
                            boolValue: e.target.checked,
                        },
                    }).catch(() => {});
                }}
                color="primary"
            />
        );
    }

    // Number: Inline TextField
    if (tracker.type === 'Number') {
        return (
            <TextField
                type="text"
                inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                value={localValue}
                onChange={(e) => {
                    const inputVal = e.target.value;
                    setLocalValue(inputVal);
                }}
                onBlur={() => {
                    if (localValue === '') {
                        setValue({
                            variables: {
                                trackerId: tracker.id,
                                date,
                                numberValue: null,
                            },
                        }).catch(() => {});
                    } else {
                        const parsed = parseFloat(localValue);
                        if (!isNaN(parsed)) {
                            setValue({
                                variables: {
                                    trackerId: tracker.id,
                                    date,
                                    numberValue: parsed,
                                },
                            }).catch(() => {});
                        }
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    }
                }}
                style={{width: 80}}
            />
        );
    }

    // Text: Opens dialog on click
    if (tracker.type === 'Text') {
        return (
            <>
                <TextField
                    value={(value && value.textValue) || ''}
                    onClick={() => {
                        setTextValue((value && value.textValue) || '');
                        setDialogOpen(true);
                    }}
                    inputProps={{readOnly: true}}
                    placeholder="Click to edit"
                    style={{width: 120, cursor: 'pointer'}}
                />
                <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle>Edit Tracker Value</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            multiline
                            rows={4}
                            fullWidth
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            placeholder="Enter value..."
                            variant="outlined"
                            style={{marginTop: 10}}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)} color="primary">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setValue({
                                    variables: {
                                        trackerId: tracker.id,
                                        date,
                                        textValue: textValue,
                                    },
                                }).then(() => setDialogOpen(false))
                                .catch(() => {});
                            }}
                            color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    return null;
};
