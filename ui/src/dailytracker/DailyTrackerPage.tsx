import * as React from 'react';
import Paper from '@material-ui/core/Paper';
import {makeStyles} from '@material-ui/core/styles';
import {useMutation, useQuery} from '@apollo/react-hooks';
import * as gqlDailyTracker from '../gql/dailyTracker';
import {CenteredSpinner} from '../common/CenteredSpinner';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import DoneIcon from '@material-ui/icons/Done';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import {useSnackbar} from 'notistack';
import {TextField} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import {DailyTrackers} from '../gql/__generated__/DailyTrackers';
import {RemoveDailyTracker, RemoveDailyTrackerVariables} from '../gql/__generated__/RemoveDailyTracker';
import {UpdateDailyTracker, UpdateDailyTrackerVariables} from '../gql/__generated__/UpdateDailyTracker';
import {AddDailyTrackerDialog} from './AddDailyTrackerDialog';
import {SliderPicker} from 'react-color';
import {handleError} from '../utils/errors';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {Select, MenuItem, FormControl, FormControlLabel, Checkbox, Chip, Box} from '@material-ui/core';
import {Whatshot} from '@material-ui/icons';
import {TrackerType} from '../gql/__generated__/globalTypes';

const useStyles = makeStyles((theme) => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(3),
        paddingBottom: theme.spacing(3),
        textAlign: 'center',
        maxWidth: 1200,
        margin: '0 auto',
    },
}));

export const DailyTrackerPage = () => {
    const classes = useStyles();
    const {data, loading} = useQuery<DailyTrackers>(gqlDailyTracker.DailyTrackers);
    const [removeTrackerConfirm, setRemoveTrackerConfirm] = React.useState<number | null>(null);
    const refetch = {refetchQueries: [{query: gqlDailyTracker.DailyTrackers}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeDailyTracker] = useMutation<RemoveDailyTracker, RemoveDailyTrackerVariables>(
        gqlDailyTracker.RemoveDailyTracker,
        refetch
    );

    type EditState = [number, string, TrackerType, boolean, string] | null;
    const [editState, setEditState] = React.useState<EditState>(null);
    const [addActive, setAddActive] = React.useState(false);
    const [updateDailyTracker] = useMutation<UpdateDailyTracker, UpdateDailyTrackerVariables>(
        gqlDailyTracker.UpdateDailyTracker,
        refetch
    );

    if (loading || !data || !data.dailyTrackers) {
        return <CenteredSpinner />;
    }

    const onClickDelete = () => {
        if (removeTrackerConfirm === null) return;
        return removeDailyTracker({variables: {id: removeTrackerConfirm}})
            .then(() => {
                enqueueSnackbar('Daily tracker deleted', {variant: 'success'});
                setRemoveTrackerConfirm(null);
            })
            .catch(handleError('Delete Daily Tracker', enqueueSnackbar));
    };

    const getStreakColor = (days: number) => {
        if (days >= 100) return '#FF4500';  // Red-orange for 100+
        if (days >= 30) return '#FF8C00';   // Dark orange for 30+
        if (days >= 7) return '#FFA500';    // Orange for 7+
        return '#FFD700';                   // Gold for starting
    };

    const trackers = data.dailyTrackers.map((tracker) => {
        const onClickSubmit = () => {
            if (editState === null) return;
            const [id, , , ,] = editState;
            setEditState(null);
            updateDailyTracker({
                variables: {
                    id,
                    name: editState[1],
                    type: editState[2],
                    chainable: editState[3],
                    color: editState[4],
                },
            })
                .then(() => enqueueSnackbar('Daily tracker edited', {variant: 'success'}))
                .catch(handleError('Edit Daily Tracker', enqueueSnackbar));
        };

        const isEdited = editState !== null && editState[0] === tracker.id;

        return (
            <TableRow key={tracker.id}>
                <TableCell>
                    {isEdited ? (
                        <TextField
                            value={editState![1]}
                            onChange={(e) => setEditState([editState![0], e.target.value, editState![2], editState![3], editState![4]])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onClickSubmit();
                                }
                            }}
                            style={{minWidth: 128}}
                        />
                    ) : (
                        tracker.name
                    )}
                </TableCell>
                <TableCell>
                    {isEdited ? (
                        <FormControl style={{minWidth: 120}}>
                            <Select
                                value={editState![2]}
                                onChange={(e) => setEditState([editState![0], editState![1], e.target.value as TrackerType, editState![3], editState![4]])}>
                                <MenuItem value={TrackerType.Text}>Text</MenuItem>
                                <MenuItem value={TrackerType.Number}>Number</MenuItem>
                                <MenuItem value={TrackerType.Boolean}>Boolean</MenuItem>
                            </Select>
                        </FormControl>
                    ) : (
                        tracker.type
                    )}
                </TableCell>
                <TableCell>
                    {isEdited ? (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editState![3]}
                                    onChange={(e) => setEditState([editState![0], editState![1], editState![2], e.target.checked, editState![4]])}
                                    color="primary"
                                />
                            }
                            label="Chainable"
                        />
                    ) : (
                        tracker.chainable ? 'Yes' : 'No'
                    )}
                </TableCell>
                <TableCell style={{minWidth: 128}}>
                    {isEdited ? (
                        <SliderPicker onChange={(c) => setEditState([editState![0], editState![1], editState![2], editState![3], c.hex])} color={editState![4]} />
                    ) : (
                        <div style={{backgroundColor: tracker.color, width: 40, height: 20, border: '1px solid #ccc'}} />
                    )}
                </TableCell>
                <TableCell>
                    {tracker.chainable ? (
                        <Box display="flex" alignItems="center" justifyContent="center">
                            <Whatshot style={{color: getStreakColor(tracker.streakDays), marginRight: 4}} />
                            <span>{tracker.streakDays} days</span>
                            {tracker.milestoneBadges.map((badge, i) => (
                                <Chip key={i} label={badge} size="small" style={{marginLeft: 4}} />
                            ))}
                        </Box>
                    ) : (
                        '-'
                    )}
                </TableCell>
                <TableCell align="right">
                    {isEdited ? (
                        <>
                            <IconButton onClick={onClickSubmit} title="Save">
                                <DoneIcon />
                            </IconButton>
                            <IconButton onClick={() => setEditState(null)} title="Cancel">
                                <CloseIcon />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton onClick={() => setEditState([tracker.id, tracker.name, tracker.type as TrackerType, tracker.chainable, tracker.color])} title="Edit">
                                <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => setRemoveTrackerConfirm(tracker.id)} title="Delete">
                                <DeleteIcon />
                            </IconButton>
                        </>
                    )}
                </TableCell>
            </TableRow>
        );
    });

    return (
        <Paper elevation={1} square={true} className={classes.root}>
            <Button
                color={'primary'}
                variant={'outlined'}
                size="small"
                onClick={() => setAddActive(true)}
                fullWidth
                style={{marginBottom: 10}}>
                Create Daily Tracker
            </Button>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Chainable</TableCell>
                        <TableCell>Color</TableCell>
                        <TableCell>Streak</TableCell>
                        <TableCell style={{width: 150}} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {addActive ? <AddDailyTrackerDialog open={true} close={() => setAddActive(false)} /> : null}
                    {trackers}
                    {removeTrackerConfirm !== null ? (
                        <ConfirmDialog
                            title={`Delete Daily Tracker`}
                            fClose={() => setRemoveTrackerConfirm(null)}
                            fOnSubmit={onClickDelete}>
                            <b>This operation cannot be undone.</b> Deleting the tracker will remove all tracked values.
                        </ConfirmDialog>
                    ) : null}
                </TableBody>
            </Table>
        </Paper>
    );
};
