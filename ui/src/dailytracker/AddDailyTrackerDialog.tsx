import * as React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {SliderPicker} from 'react-color';
import {InputLabel} from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import {Select, MenuItem} from '@material-ui/core';
import {FormControlLabel, Checkbox} from '@material-ui/core';
import {useMutation} from '@apollo/react-hooks';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import * as gqlDailyTracker from '../gql/dailyTracker';
import {CreateDailyTracker, CreateDailyTrackerVariables} from '../gql/__generated__/CreateDailyTracker';
import {TrackerType} from '../gql/__generated__/globalTypes';

interface AddDailyTrackerDialogProps {
    open: boolean;
    close: () => void;
}

export const AddDailyTrackerDialog: React.FC<AddDailyTrackerDialogProps> = ({close, open}) => {
    const [name, setName] = React.useState('');
    const [trackerType, setTrackerType] = React.useState<TrackerType>(TrackerType.Text);
    const [chainable, setChainable] = React.useState(false);
    const [color, setColor] = React.useState('#e6b3b3');
    const {enqueueSnackbar} = useSnackbar();

    const [createDailyTracker] = useMutation<CreateDailyTracker, CreateDailyTrackerVariables>(
        gqlDailyTracker.CreateDailyTracker,
        {refetchQueries: [{query: gqlDailyTracker.DailyTrackers}]}
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        createDailyTracker({variables: {name, type: trackerType, chainable, color}})
            .then(() => {
                close();
                setName('');
                setTrackerType(TrackerType.Text);
                setChainable(false);
                setColor('#e6b3b3');
                enqueueSnackbar('Daily tracker created', {variant: 'success'});
            })
            .catch(handleError('Add Daily Tracker', enqueueSnackbar));
    };

    return (
        <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title" fullWidth>
            <form onSubmit={submit} noValidate autoComplete="off">
                <DialogTitle id="form-dialog-title">Create Daily Tracker</DialogTitle>
                <DialogContent>
                    <DialogContentText />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Name"
                        type="text"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel htmlFor="tracker-type">Type</InputLabel>
                        <Select
                            value={trackerType}
                            onChange={(e) => setTrackerType(e.target.value as TrackerType)}
                            inputProps={{id: 'tracker-type'}}>
                            <MenuItem value={TrackerType.Text}>Text</MenuItem>
                            <MenuItem value={TrackerType.Number}>Number</MenuItem>
                            <MenuItem value={TrackerType.Boolean}>Boolean</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={chainable}
                                    onChange={(e) => setChainable(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Chainable (track streaks)"
                        />
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel htmlFor="color-picker" shrink={true}>
                            Color
                        </InputLabel>
                        <div id="color-picker" style={{marginTop: 25}}>
                            <SliderPicker onChange={(c) => setColor(c.hex)} color={color} />
                        </div>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        Cancel
                    </Button>
                    <Button type="submit" onClick={submit} color="primary">
                        Create Tracker
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
